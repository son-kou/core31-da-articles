"""Sentence clips + full-unit audio for the Deep Teacher site. LOCAL ONLY (needs ffmpeg + faster-whisper); CI never runs it.

    python3 scripts/audio/build_audio.py              # all units
    SHARD=0/3 python3 scripts/audio/build_audio.py    # warm the re-check cache for every 3rd candidate only (parallel)

No TTS, no network (HF_HUB_OFFLINE=1). Every source is opened read-only:
  - frozen CORE           V3_CORPUS_WRITING/DANISH_C1_CORPUS_V3/CORE/Uxx.md
  - full-unit MP3s        V3_CORE_AUDIO/Uxx_CORE.mp3               (copied byte-for-byte to public/audio/full/Uxx.mp3)
  - lossless segments     V3_CORE_AUDIO/SEGMENTS/Uxx/Uxx-Snn.wav + Uxx_SEGMENTS.tsv (segment offsets in the full MP3)
  - verified boundaries   V3_ANKI_INTEGRATION/WORK/audio_align/Uxx_LINES_EXACT.tsv (silence + ASR-anchor alignment)
  - verified 48k clips    V3_ANKI_INTEGRATION/WORK/audio_final/ + audio_final.jsonl (731 clips, re-check passed earlier)
`*_LINES_APPROX.tsv` (proportional estimates) is never read.

A sentence gets a clip only if
  1. its alignment row has start/end cut points from verified pauses (status EXACT, or UNCERTAIN for a non-boundary reason
     other than too_short — those are "recovered" only through step 4);
  2. the row's raw-line and text hashes equal the frozen CORE line, and the segment WAV still has its aligned SHA-256;
  3. the cut clip (MP3 CBR 48 kbps mono 24 kHz from the WAV, 20/40 ms fades — the Anki release encoding) decodes cleanly,
     its duration equals the cut (± 0.08 s), and lead/trail silence ≤ 0.35 s;
  4. an independent re-transcription of the clip ALONE matches the frozen sentence (letter similarity ≥ 0.80, first and last
     ten letters ≥ 0.6). Cached by clip SHA-256.
Everything else is listed as unavailable; the site then shows no sentence play button rather than a wrong segment.
"""
from __future__ import annotations

import csv
import difflib
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

os.environ.setdefault("HF_HUB_OFFLINE", "1")
for _m in ("torch", "torchaudio", "functorch"):     # faster-whisper does not need torch; importing it clashes with libiomp
    sys.modules[_m] = None

SITE = Path(__file__).resolve().parents[2]
ROOT = SITE.parent                                   # danish-articles/
CORE_DIR = Path(os.environ.get("CORE_DIR", ROOT / "V3_CORPUS_WRITING/DANISH_C1_CORPUS_V3/CORE"))
AUDIO_DIR = ROOT / "V3_CORE_AUDIO"
ALIGN = ROOT / "V3_ANKI_INTEGRATION/WORK/audio_align"
FINAL = ROOT / "V3_ANKI_INTEGRATION/WORK/audio_final"
FINAL_JSONL = ROOT / "V3_ANKI_INTEGRATION/WORK/audio_final.jsonl"

OUT_FULL = SITE / "public/audio/full"
OUT_SENT = SITE / "public/audio/sentences"
OUT_DATA = SITE / "src/data/audio"
REPORTS = SITE / "reports"
CACHE = SITE / ".audio-work/recheck"

RATE, SR = 48, 24000
ID_RE = re.compile(r"^(?:> )?(U\d{2}-C\d{3}) (.*)$")
DLG_RE = re.compile(r"^@([^:]+): (.*)$")


def sha256(p: Path | str) -> str:
    h = hashlib.sha256()
    if isinstance(p, str):
        h.update(p.encode("utf-8"))
        return h.hexdigest()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def parse_core(unit: str) -> list[dict]:
    out, fm = [], 0
    for raw in (CORE_DIR / f"{unit}.md").read_text(encoding="utf-8").split("\n"):
        if fm < 2:
            fm += raw.strip() == "---"
            continue
        if not raw.strip() or raw.startswith("## "):
            continue
        m = ID_RE.match(raw)
        if not m:
            raise SystemExit(f"{unit}: unparsed line {raw[:60]!r}")
        lid, body = m.groups()
        d = DLG_RE.match(body)
        if d:
            body = d.group(2)
        out.append({"id": lid, "text": body, "text_sha256": sha256(body), "raw_sha256": sha256(raw)})
    return out


def tsv(p: Path) -> list[dict]:
    with open(p, encoding="utf-8") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def probe_duration(p: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(p)], capture_output=True, text=True)
    return float(json.loads(r.stdout)["format"]["duration"])


def edge_silence(p: Path) -> tuple[float, float]:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(p), "-af", "silencedetect=noise=-42dB:d=0.05", "-f", "null", "-"],
                       capture_output=True, text=True)
    d = probe_duration(p)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    lead = ends[0] if starts and starts[0] <= 0.02 and ends else 0.0
    trail = d - starts[-1] if starts and (len(ends) < len(starts) or ends[-1] >= d - 0.02) else 0.0
    return round(lead, 3), round(trail, 3)


def letters(x: str) -> str:
    return re.sub(r"[^a-zæøåéü]", "", x.lower())


_model = None


def transcribe(p: Path, beam: int = 1) -> str:
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel("small", device="cpu", compute_type="int8", local_files_only=True,
                              cpu_threads=int(os.environ.get("THREADS", "3")), num_workers=1)
    segs, _ = _model.transcribe(str(p), language="da", beam_size=beam, condition_on_previous_text=False)
    return " ".join(x.text.strip() for x in segs)


def main() -> None:
    units = [a for a in sys.argv[1:] if a.startswith("U")] or [f"U{i:02d}" for i in range(31)]
    shard = os.environ.get("SHARD")
    si, sn = map(int, shard.split("/")) if shard else (0, 1)
    final_rows = {}
    if FINAL_JSONL.exists():
        for line in FINAL_JSONL.read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            final_rows[r["sentence_id"]] = r
    wav_ok: dict[str, bool] = {}
    report_rows, k = [], -1
    for unit in units:
        core = parse_core(unit)
        segs = {s["seg_id"]: s for s in tsv(AUDIO_DIR / "SEGMENTS" / f"{unit}_SEGMENTS.tsv")}
        align = {r["line_id"]: r for r in tsv(ALIGN / f"{unit}_LINES_EXACT.tsv")}
        full_src = AUDIO_DIR / f"{unit}_CORE.mp3"
        manifest = {"unit": unit, "full": None, "sentences": {}}
        if not shard:
            OUT_FULL.mkdir(parents=True, exist_ok=True)
            dst = OUT_FULL / f"{unit}.mp3"
            if not dst.exists() or sha256(dst) != sha256(full_src):
                shutil.copyfile(full_src, dst)
            manifest["full"] = {"file": f"audio/full/{unit}.mp3", "duration_s": round(probe_duration(dst), 2),
                                "bytes": dst.stat().st_size, "sha256": sha256(dst), "source": f"V3_CORE_AUDIO/{unit}_CORE.mp3"}
        for s in core:
            k += 1
            sid = s["id"]
            a = align.get(sid)
            row = {"unit": unit, "id": sid, "status": "unavailable", "reason": "", "similarity": ""}
            report_rows.append(row)
            if not a:
                row["reason"] = "no_alignment_row"
                continue
            if a["status"] != "EXACT":
                if a["reason"].startswith("boundary") or "too_short" in a["reason"] or not a.get("start_s"):
                    row["reason"] = "alignment_uncertain:" + a["reason"]
                    continue
            if a["src_sha256"] != s["raw_sha256"] or a["text_sha256"] != s["text_sha256"]:
                row["reason"] = "hash_mismatch_vs_frozen_core"
                continue
            if k % sn != si:
                continue
            seg = segs[a["seg_id"]]
            wav = AUDIO_DIR / seg["audio_segment"]
            if a["seg_id"] not in wav_ok:
                cache = ALIGN / "asr" / f"{a['seg_id']}.json"
                wav_ok[a["seg_id"]] = wav.exists() and cache.exists() and sha256(wav) == json.loads(cache.read_text())["wav_sha256"]
            if not wav_ok[a["seg_id"]]:
                row["reason"] = "segment_wav_changed_or_missing"
                continue
            out = OUT_SENT / unit / f"{sid}.mp3"
            out.parent.mkdir(parents=True, exist_ok=True)
            fr = final_rows.get(sid)
            if fr and fr["src_sha256"] == s["raw_sha256"] and (FINAL / fr["file"]).exists() and sha256(FINAL / fr["file"]) == fr["clip_sha256"]:
                if not out.exists() or sha256(out) != fr["clip_sha256"]:
                    shutil.copyfile(FINAL / fr["file"], out)
            elif not out.exists():
                tmp = out.with_name(out.stem + ".tmp.mp3")
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a["start_s"]), "-to", str(a["end_s"]), "-i", str(wav), "-ac", "1",
                                "-ar", str(SR), "-af", "afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse", "-c:a", "libmp3lame",
                                "-b:a", f"{RATE}k", "-write_xing", "1", str(tmp)], check=True)
                tmp.replace(out)
            csha = sha256(out)
            dec = subprocess.run(["ffmpeg", "-v", "error", "-i", str(out), "-f", "null", "-"], capture_output=True, text=True)
            d = probe_duration(out)
            want = float(a["end_s"]) - float(a["start_s"])
            lead, trail = edge_silence(out)
            cp = CACHE / f"{sid}.json"
            heard = None
            if cp.exists():
                c = json.loads(cp.read_text(encoding="utf-8"))
                heard = c["heard"] if c["clip_sha256"] == csha else None
            if heard is None and fr and fr["clip_sha256"] == csha:
                old = ALIGN / "recheck_final" / f"{fr['file']}.json"
                if old.exists() and json.loads(old.read_text())["clip_sha256"] == csha:
                    heard = json.loads(old.read_text())["heard"]
            if heard is None:
                heard = transcribe(out)
            CACHE.mkdir(parents=True, exist_ok=True)
            cp.write_text(json.dumps({"clip_sha256": csha, "heard": heard}, ensure_ascii=False), encoding="utf-8")
            rl = letters(s["text"])

            def score(heard_text: str) -> tuple[float, bool]:
                hl = letters(heard_text)
                return (difflib.SequenceMatcher(None, rl, hl, autojunk=False).ratio(),
                        bool(hl) and difflib.SequenceMatcher(None, rl[:10], hl[:10]).ratio() >= 0.6
                        and difflib.SequenceMatcher(None, rl[-10:], hl[-10:]).ratio() >= 0.6)
            sim, edges = score(heard)
            if sim < 0.80 or not edges:
                # second opinion with beam search (as in the original 64 kbps Anki re-check); same thresholds
                cp5 = CACHE.parent / "recheck_b5" / f"{sid}.json"
                heard5 = None
                if cp5.exists():
                    c5 = json.loads(cp5.read_text(encoding="utf-8"))
                    heard5 = c5["heard"] if c5["clip_sha256"] == csha else None
                if heard5 is None:
                    heard5 = transcribe(out, beam=5)
                    cp5.parent.mkdir(parents=True, exist_ok=True)
                    cp5.write_text(json.dumps({"clip_sha256": csha, "heard": heard5}, ensure_ascii=False), encoding="utf-8")
                sim5, edges5 = score(heard5)
                if sim5 >= 0.80 and edges5:
                    sim, edges = sim5, edges5
            why = []
            if dec.returncode or dec.stderr.strip():
                why.append("decode_error")
            if abs(d - want) > 0.08:
                why.append(f"duration {d:.2f} vs {want:.2f}")
            if lead > 0.35 or trail > 0.35:
                why.append(f"edge_silence {lead}/{trail}")
            if sim < 0.80 or not edges:
                why.append(f"recheck sim={sim:.2f} edges={edges}")
            row["similarity"] = f"{sim:.3f}"
            if why:
                row["reason"] = "clip_check_failed:" + ";".join(why)
                out.unlink()
                continue
            off = float(seg["start_s"])
            row["status"] = "verified" if a["status"] == "EXACT" else "recovered"
            row["reason"] = a["method"] if a["status"] == "EXACT" else "independent_recheck_after:" + a["reason"]
            manifest["sentences"][sid] = {
                "clip": f"audio/sentences/{unit}/{sid}.mp3", "clip_s": round(d, 2), "clip_sha256": csha,
                "full_start_s": round(off + float(a["start_s"]), 3), "full_end_s": round(off + float(a["end_s"]), 3),
                "text_sha256": s["text_sha256"], "recheck_similarity": round(sim, 3), "method": row["reason"]}
        if not shard:
            OUT_DATA.mkdir(parents=True, exist_ok=True)
            (OUT_DATA / f"{unit}.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            n = len(core)
            print(f"{unit}: {len(manifest['sentences'])}/{n} sentence clips", flush=True)
    if shard:
        print(f"shard {shard} done", flush=True)
        return
    # stale clips (e.g. after an erratum) are removed so the published folder equals the manifest
    keep = {f"{r['unit']}/{r['id']}.mp3" for r in report_rows if r["status"] != "unavailable"}
    for p in OUT_SENT.glob("U??/*.mp3"):
        if p.parent.name in units and f"{p.parent.name}/{p.name}" not in keep:
            p.unlink()
    index = {}
    for p in sorted(OUT_DATA.glob("U??.json")):
        m = json.loads(p.read_text(encoding="utf-8"))
        index[m["unit"]] = {"duration_s": m["full"]["duration_s"] if m["full"] else None, "clips": len(m["sentences"])}
    (OUT_DATA / "index.json").write_text(json.dumps(index, indent=1) + "\n", encoding="utf-8")
    REPORTS.mkdir(exist_ok=True)
    cols = ["unit", "id", "status", "reason", "similarity"]
    with open(REPORTS / "AUDIO_COVERAGE.tsv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, cols, delimiter="\t", lineterminator="\n")
        w.writeheader()
        w.writerows(report_rows)
    print(json.dumps({"sentences": len(report_rows), "with_clip": len(keep)}))


if __name__ == "__main__":
    main()

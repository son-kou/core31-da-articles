// Frozen CORE unit format ⇄ structured JSON. Pure functions (no Node or DOM APIs) shared by scripts, tests and the site.
//
// Source format (V3_CORPUS_WRITING/DANISH_C1_CORPUS_V3/CORE/Uxx.md):
//   front matter between `---` lines · `## ` chapter headings · blank line = new paragraph
//   `Uxx-Cnnn text` narration · `> Uxx-Cnnn text` line of an embedded written document · `Uxx-Cnnn @Speaker: text` dialogue turn
// renderCoreMarkdown(parseCoreMarkdown(md)) must reproduce the file byte for byte; the integrity check relies on that.

export interface CoreSentence {
  id: string;
  text: string; // verbatim utterance, without ID and speaker label
  speaker?: string;
  doc?: boolean; // `> ` line of an embedded document (mail, agenda …)
  ch: number; // chapter index
  p: number; // paragraph index within the unit (0-based, global)
}

export interface CoreChapter {
  title: string;
}

export interface CoreUnit {
  schema: 1;
  unit: string;
  title: string;
  subtitle: string;
  labels: string[];
  status: string;
  frontmatter: string[]; // raw lines between the `---` fences, kept verbatim
  chapters: CoreChapter[];
  sentences: CoreSentence[];
}

const ID_RE = /^(> )?(U\d{2}-C\d{3}) (.*)$/;
const DLG_RE = /^@([^:]+): (.*)$/;

export function parseCoreMarkdown(md: string, unit: string): CoreUnit {
  const lines = md.split('\n');
  if (lines[0] !== '---') throw new Error(`${unit}: missing front matter`);
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error(`${unit}: unterminated front matter`);
  const frontmatter = lines.slice(1, end);
  const meta: Record<string, string> = {};
  for (const l of frontmatter) {
    const m = /^([a-z_]+): (.*)$/.exec(l);
    if (!m) throw new Error(`${unit}: unparsed front matter line ${JSON.stringify(l)}`);
    meta[m[1]] = m[2];
  }
  if (meta.unit !== unit) throw new Error(`${unit}: front matter says unit ${meta.unit}`);
  const chapters: CoreChapter[] = [];
  const sentences: CoreSentence[] = [];
  let para = -1;
  let newPara = true;
  for (let n = end + 1; n < lines.length; n++) {
    const raw = lines[n];
    if (n === lines.length - 1 && raw === '') break; // trailing newline
    if (raw === '') {
      newPara = true;
      continue;
    }
    if (raw.startsWith('## ')) {
      chapters.push({ title: raw.slice(3) });
      newPara = true;
      continue;
    }
    const m = ID_RE.exec(raw);
    if (!m) throw new Error(`${unit}:${n + 1}: unparsed line ${JSON.stringify(raw.slice(0, 60))}`);
    if (!chapters.length) throw new Error(`${unit}:${n + 1}: sentence before the first chapter heading`);
    const [, quote, id, rest] = m;
    if (!id.startsWith(unit + '-')) throw new Error(`${unit}:${n + 1}: foreign ID ${id}`);
    if (newPara) para++;
    newPara = false;
    const s: CoreSentence = { id, text: rest, ch: chapters.length - 1, p: para };
    const d = DLG_RE.exec(rest);
    if (d) {
      s.speaker = d[1];
      s.text = d[2];
    }
    if (quote) s.doc = true;
    sentences.push(s);
  }
  return {
    schema: 1,
    unit,
    title: meta.title ?? '',
    subtitle: meta.subtitle ?? '',
    labels: (meta.labels ?? '').split(' · ').filter(Boolean),
    status: meta.status ?? '',
    frontmatter,
    chapters,
    sentences,
  };
}

/** Rebuild the exact source file from the structured unit. */
export function renderCoreMarkdown(u: CoreUnit): string {
  const out: string[] = ['---', ...u.frontmatter, '---'];
  let ch = -1;
  let p = -1;
  for (const s of u.sentences) {
    while (ch < s.ch) {
      ch++;
      if (out.length > u.frontmatter.length + 2) out.push('');
      out.push('## ' + u.chapters[ch].title, '');
      p = s.p;
    }
    if (s.p !== p) {
      out.push('');
      p = s.p;
    }
    const body = s.speaker !== undefined ? `@${s.speaker}: ${s.text}` : s.text;
    out.push(`${s.doc ? '> ' : ''}${s.id} ${body}`);
  }
  return out.join('\n') + '\n';
}

/** What the audio and the learner hear/see: the utterance only. */
export function sentenceIndex(u: CoreUnit): Map<string, CoreSentence> {
  return new Map(u.sentences.map((s) => [s.id, s]));
}

export interface UnitSummary {
  unit: string;
  title: string;
  subtitle: string;
  labels: string[];
  sentences: number;
  chapters: string[];
  dialogue: number;
}

export function summarize(u: CoreUnit): UnitSummary {
  return {
    unit: u.unit,
    title: u.title,
    subtitle: u.subtitle,
    labels: u.labels,
    sentences: u.sentences.length,
    chapters: u.chapters.map((c) => c.title),
    dialogue: u.sentences.filter((s) => s.speaker !== undefined).length,
  };
}

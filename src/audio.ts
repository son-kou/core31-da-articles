// One full-article player + one sentence-clip player per page. Starting either pauses the other, so audio never overlaps.
// Sentence playback uses only verified clips; sentences without one have no play button (see AUDIO_COVERAGE report).
import { assetUrl, type UnitAudio } from './data';
import { store } from './store';

type Listener = () => void;

export class AudioHub {
  readonly full = new Audio();
  readonly clip = new Audio();
  clipId: string | null = null;
  loop = false;
  private listeners = new Set<Listener>();
  private clipEndedCb: ((id: string) => void) | null = null;
  private loopTimer: number | undefined;

  constructor(readonly data: UnitAudio | null) {
    this.full.preload = 'metadata';
    this.clip.preload = 'auto';
    if (data?.full) this.full.src = assetUrl(data.full.file);
    this.setSpeed(store.get().speed);
    this.full.addEventListener('play', () => {
      this.stopClip();
      this.emit();
    });
    this.clip.addEventListener('play', () => {
      if (!this.full.paused) this.full.pause();
      this.emit();
    });
    for (const ev of ['pause', 'ended', 'timeupdate', 'loadedmetadata', 'ratechange', 'error'] as const) {
      this.full.addEventListener(ev, () => this.emit());
      this.clip.addEventListener(ev, () => this.emit());
    }
    this.clip.addEventListener('ended', () => {
      const id = this.clipId;
      if (!id) return;
      if (this.loop) {
        this.loopTimer = window.setTimeout(() => {
          if (this.clipId === id && this.loop) {
            this.clip.currentTime = 0;
            void this.clip.play().catch(() => undefined);
          }
        }, 450);
      } else {
        this.clipEndedCb?.(id);
      }
    });
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((f) => f());
  }

  hasClip(id: string) {
    return !!this.data?.sentences[id];
  }

  /** Play the verified clip of a sentence. Returns false when there is none (never plays a neighbouring segment). */
  playSentence(id: string, keepLoop = false): boolean {
    const a = this.data?.sentences[id];
    if (!a) return false;
    window.clearTimeout(this.loopTimer);
    if (this.clipId !== id && !keepLoop) this.loop = false;
    if (this.clipId !== id) {
      this.clipId = id;
      this.clip.src = assetUrl(a.clip);
    } else this.clip.currentTime = 0;
    this.clip.defaultPlaybackRate = this.clip.playbackRate = store.get().speed;
    void this.clip.play().catch(() => this.emit());
    this.emit();
    return true;
  }

  toggleSentence(id: string) {
    if (this.clipId === id && !this.clip.paused) this.stopClip();
    else this.playSentence(id);
  }

  stopClip() {
    window.clearTimeout(this.loopTimer);
    if (!this.clip.paused) this.clip.pause();
    this.emit();
  }

  isPlaying(id: string) {
    return this.clipId === id && !this.clip.paused;
  }

  onClipEnded(cb: ((id: string) => void) | null) {
    this.clipEndedCb = cb;
  }

  setLoop(v: boolean) {
    this.loop = v;
    if (!v) window.clearTimeout(this.loopTimer);
    this.emit();
  }

  setSpeed(v: number) {
    store.set('speed', v);
    // Safari resets playbackRate to defaultPlaybackRate whenever a new source loads
    for (const el of [this.full, this.clip]) {
      el.defaultPlaybackRate = v;
      el.playbackRate = v;
    }
    this.emit();
  }

  toggleFull() {
    if (!this.data?.full) return;
    if (this.full.paused) void this.full.play().catch(() => this.emit());
    else this.full.pause();
  }

  seekFull(t: number, play = false) {
    if (!this.data?.full) return;
    this.full.currentTime = Math.max(0, t);
    if (play) void this.full.play().catch(() => this.emit());
    this.emit();
  }

  /** Sentence being spoken in the full recording, only where its start/end are verified. */
  sentenceAt(t: number): string | null {
    const s = this.data?.sentences;
    if (!s) return null;
    for (const [id, a] of Object.entries(s)) if (t >= a.full_start_s && t < a.full_end_s) return id;
    return null;
  }

  destroy() {
    window.clearTimeout(this.loopTimer);
    this.full.pause();
    this.clip.pause();
    this.full.removeAttribute('src');
    this.clip.removeAttribute('src');
    this.listeners.clear();
  }
}

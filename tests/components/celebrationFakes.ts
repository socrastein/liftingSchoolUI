import { vi } from "vitest";

/**
 * Stand-ins for the two browser parts the celebrations lean on and jsdom lacks: a canvas that records what is drawn on it, and an
 * audio context that records the sounds made. Shared by the celebration tests, which live in this folder because the
 * type check of tests/ here covers Vue and TypeScript.
 */

/** What a fake audio node can be asked to do; every method records that it was called. */
function createFakeParam() {
  return { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() };
}

/** One audio node of any kind: it can be connected (which gives back the node it was connected to, so chains work), started and stopped. */
function createFakeNode() {
  return {
    gain: createFakeParam(),
    frequency: createFakeParam(),
    type: "",
    buffer: null as unknown,
    connect: vi.fn((next: unknown) => next),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

export type FakeNode = ReturnType<typeof createFakeNode>;

/** An audio context whose `state` and the answer to `resume()` a test sets, and that keeps every node it made. */
export class FakeAudioContext {
  state: "running" | "suspended" = "running";
  currentTime = 0;
  sampleRate = 8000;
  destination = createFakeNode();
  gains: FakeNode[] = [];
  oscillators: FakeNode[] = [];
  resumeCalls = 0;
  /** What `resume()` does: resolve (and run), or reject like a browser that refuses. */
  resumeOutcome: "runs" | "refuses" = "runs";

  createGain(): FakeNode {
    const node = createFakeNode();
    this.gains.push(node);
    return node;
  }

  createOscillator(): FakeNode {
    const node = createFakeNode();
    this.oscillators.push(node);
    return node;
  }

  createBufferSource(): FakeNode {
    return createFakeNode();
  }

  createBiquadFilter(): FakeNode {
    return createFakeNode();
  }

  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    const samples = new Float32Array(length);
    return { getChannelData: () => samples };
  }

  resume(): Promise<void> {
    this.resumeCalls++;
    if (this.resumeOutcome === "refuses") return Promise.reject(new Error("not allowed"));
    this.state = "running";
    return Promise.resolve();
  }
}

/** A canvas 2D context that counts the clears and the shapes drawn, so a test can tell whether something was drawn. */
export function createFakeCanvasContext() {
  return {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
  };
}

export type FakeCanvasContext = ReturnType<typeof createFakeCanvasContext>;

/**
 * Makes every canvas in the page answer with one fake 2D context.
 *
 * @returns The context, to look at after the page has drawn.
 */
export function installFakeCanvas(): FakeCanvasContext {
  const context = createFakeCanvasContext();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as never);
  return context;
}

/** The one fake the page's audio code gets, since celebrationSounds.js keeps its first context for the life of the page. */
const sharedFakeAudio = new FakeAudioContext();

/**
 * Makes the page's audio context a fake, reset to a running context that has made nothing yet.
 *
 * @returns The same fake every time, for the test to set up and look at.
 */
export function installFakeAudio(): FakeAudioContext {
  Object.assign(sharedFakeAudio, new FakeAudioContext());
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    writable: true,
    value: vi.fn(function () {
      // A constructor called with `new` that hands back the shared fake
      return sharedFakeAudio;
    }),
  });
  return sharedFakeAudio;
}

/** Makes `prefers-reduced-motion: reduce` match or not for the page. */
export function setReducedMotion(isReduced: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({ matches: isReduced })),
  });
}

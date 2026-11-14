// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canvasPixelRatio, drawStillShow, readCelebrationPalette, startShowOnCanvas } from "../../js/celebrationCanvas.js";
import { installFakeCanvas } from "./celebrationFakes";

/**
 * Putting a show on a canvas: the colours come from the page's tokens, the canvas is sized for the screen without growing past a
 * sane size, and the show runs on animation frames until stopped.
 */

const PALETTE = { pieces: ["red", "blue"], rocketHead: "white" };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("style");
});

describe("readCelebrationPalette", () => {
  it("reads the accent, the four plate colours and the text colour from the tokens", () => {
    const tokens = {
      "--accentFull": "#900090",
      "--plateRed": "#cc2a2a",
      "--plateYellow": "#b38600",
      "--plateGreen": "#1a7d36",
      "--plateBlue": "#1f55c7",
      "--textFull": "#131316",
    };
    for (const [name, value] of Object.entries(tokens)) document.documentElement.style.setProperty(name, value);

    const palette = readCelebrationPalette(document.documentElement);

    expect(palette.pieces).toEqual(["#900090", "#cc2a2a", "#b38600", "#1a7d36", "#1f55c7"]);
    expect(palette.rocketHead).toBe("#131316");
  });

  it("falls back to the surrounding text colour when the library's CSS is not loaded", () => {
    const palette = readCelebrationPalette(document.documentElement);

    expect(palette.pieces).toEqual(Array(5).fill("currentColor"));
    expect(palette.rocketHead).toBe("currentColor");
  });
});

describe("canvasPixelRatio", () => {
  it("is the screen's own ratio on an ordinary window", () => {
    expect(canvasPixelRatio({ width: 390, height: 844 }, 1)).toBe(1);
    expect(canvasPixelRatio({ width: 390, height: 844 }, 2)).toBe(2);
  });

  it("stops at 2 on a sharper screen", () => {
    expect(canvasPixelRatio({ width: 390, height: 844 }, 3)).toBe(2);
  });

  it("treats a missing ratio as 1", () => {
    expect(canvasPixelRatio({ width: 390, height: 844 }, 0)).toBe(1);
  });

  it("keeps the canvas at or under three million pixels on a big window", () => {
    const area = { width: 3840, height: 2160 };
    const ratio = canvasPixelRatio(area, 2);

    expect(ratio).toBeLessThan(1);
    expect(area.width * ratio * (area.height * ratio)).toBeLessThanOrEqual(3_000_000 + 1);
  });
});

describe("startShowOnCanvas", () => {
  it("sizes the canvas for the screen and draws on animation frames, once per frame", () => {
    const context = installFakeCanvas();
    const canvas = document.createElement("canvas");

    startShowOnCanvas(canvas, "confetti", { palette: PALETTE, pace: 1 });
    expect(canvas.width).toBe(window.innerWidth);
    vi.advanceTimersByTime(160);

    // clearRect runs once per drawn frame; ten frames of 16 ms in 160 ms
    expect(context.clearRect.mock.calls.length).toBeGreaterThanOrEqual(9);
    expect(context.clearRect.mock.calls.length).toBeLessThanOrEqual(11);
  });

  it("stops drawing when stopped, and can be stopped twice", () => {
    const context = installFakeCanvas();
    const stop = startShowOnCanvas(document.createElement("canvas"), "fireworks", { palette: PALETTE, pace: 1 });
    vi.advanceTimersByTime(100);

    stop();
    const clearsWhenStopped = context.clearRect.mock.calls.length;
    vi.advanceTimersByTime(500);
    stop();

    expect(context.clearRect.mock.calls.length).toBe(clearsWhenStopped + 1);
  });

  it("does nothing, and does not fail, when the browser gives no 2D context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    const stop = startShowOnCanvas(document.createElement("canvas"), "confetti", { palette: PALETTE, pace: 1 });

    expect(stop).not.toThrow();
  });
});

describe("drawStillShow", () => {
  it("draws pieces once and never schedules an animation frame", () => {
    const context = installFakeCanvas();

    drawStillShow(document.createElement("canvas"), "confetti", { palette: PALETTE, pace: 1 });

    expect(context.fillRect).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

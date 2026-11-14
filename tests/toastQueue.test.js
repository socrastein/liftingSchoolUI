import { describe, expect, it, vi } from "vitest";
import { createToastQueue, MAX_WAITING_TOASTS } from "../js/toastQueue.js";

/**
 * The queue behind every StatusToast: one toast on screen at a time, in the order requested, with a limit on how many wait.
 * Each test screen records what it was asked to draw and holds its toast up until the test calls `finish`.
 */

/**
 * A screen that logs every message it draws into `log` (as "name: message") and keeps each toast up until `finish()`.
 *
 * @param {string} name Which screen, for the log.
 * @param {string[]} log Shared by all screens, in the order they drew.
 */
function makeScreen(name, log) {
  /** @type {(() => void) | undefined} */
  let finishCurrent;
  return {
    display(/** @type {string} */ message, /** @type {() => void} */ onDrawn) {
      log.push(`${name}: ${message}`);
      onDrawn();
      return new Promise((resolve) => {
        finishCurrent = () => resolve(undefined);
      });
    },
    /** Ends the toast on screen and lets the queue move on. */
    async finish() {
      finishCurrent?.();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

describe("createToastQueue", () => {
  it("draws a request at once when nothing is on screen", () => {
    const log = /** @type {string[]} */ ([]);
    const queue = createToastQueue();

    queue.request(makeScreen("a", log), "Copied.");

    expect(log).toEqual(["a: Copied."]);
  });

  it("holds a second request until the first has gone, even from another screen", async () => {
    const log = /** @type {string[]} */ ([]);
    const queue = createToastQueue();
    const first = makeScreen("a", log);
    const second = makeScreen("b", log);

    queue.request(first, "One.");
    queue.request(second, "Two.");
    expect(log).toEqual(["a: One."]);

    await first.finish();
    expect(log).toEqual(["a: One.", "b: Two."]);
  });

  it("shows waiting messages in the order they were asked for", async () => {
    const log = /** @type {string[]} */ ([]);
    const queue = createToastQueue();
    const screen = makeScreen("a", log);

    for (const message of ["1", "2", "3"]) queue.request(screen, message);
    await screen.finish();
    await screen.finish();

    expect(log).toEqual(["a: 1", "a: 2", "a: 3"]);
  });

  it("shows the same message twice in a row when the first is already on screen", async () => {
    const log = /** @type {string[]} */ ([]);
    const queue = createToastQueue();
    const screen = makeScreen("a", log);

    queue.request(screen, "Copied.");
    queue.request(screen, "Copied.");
    await screen.finish();

    expect(log).toEqual(["a: Copied.", "a: Copied."]);
  });

  it("merges a message identical to one already waiting, so a burst does not replay", async () => {
    const log = /** @type {string[]} */ ([]);
    const queue = createToastQueue();
    const screen = makeScreen("a", log);

    queue.request(screen, "Saved.");
    for (let press = 0; press < 5; press++) queue.request(screen, "Copied.");
    await screen.finish();
    await screen.finish();
    await screen.finish();

    expect(log).toEqual(["a: Saved.", "a: Copied."]);
  });

  it("keeps at most three waiting, dropping the oldest and never the one on screen", async () => {
    const log = /** @type {string[]} */ ([]);
    const queue = createToastQueue();
    const screen = makeScreen("a", log);

    for (const message of ["on screen", "1", "2", "3", "4", "5"]) queue.request(screen, message);
    for (let turn = 0; turn < 5; turn++) await screen.finish();

    expect(MAX_WAITING_TOASTS).toBe(3);
    expect(log).toEqual(["a: on screen", "a: 3", "a: 4", "a: 5"]);
  });

  it("resolves a request's promise when the message is drawn, and when it was dropped or merged", async () => {
    const queue = createToastQueue(1);
    const screen = makeScreen("a", []);
    const settled = vi.fn();

    queue.request(screen, "on screen");
    queue.request(screen, "dropped").then(() => settled("dropped"));
    queue.request(screen, "kept").then(() => settled("kept"));
    queue.request(screen, "kept").then(() => settled("merged"));
    await Promise.resolve();
    expect(settled.mock.calls.flat().sort()).toEqual(["dropped", "merged"]);

    await screen.finish();
    expect(settled).toHaveBeenCalledWith("kept");
  });

  it("drops a leaving screen's waiting messages and keeps the others'", async () => {
    const log = /** @type {string[]} */ ([]);
    const queue = createToastQueue();
    const staying = makeScreen("stay", log);
    const leaving = makeScreen("leave", log);

    queue.request(staying, "On screen.");
    queue.request(leaving, "Never shown.");
    queue.request(staying, "Still shown.");
    queue.leave(leaving);
    await staying.finish();

    expect(log).toEqual(["stay: On screen.", "stay: Still shown."]);
  });

  it("starts the next toast at once when the screen showing leaves, and ignores its late finish", async () => {
    const log = /** @type {string[]} */ ([]);
    const queue = createToastQueue();
    const leaving = makeScreen("leave", log);
    const staying = makeScreen("stay", log);

    queue.request(leaving, "Going.");
    queue.request(staying, "Next.");
    queue.request(staying, "After.");
    queue.leave(leaving);
    expect(log).toEqual(["leave: Going.", "stay: Next."]);

    await leaving.finish();
    expect(log).toEqual(["leave: Going.", "stay: Next."]);
  });
});

/**
 * The line every StatusToast waits in. All toasts are drawn at the same spot at the bottom of the window, so one shared queue
 * lets a single one be visible at a time: each is shown for its full time, in the order requested, and the next appears only
 * after the previous has gone. A project's own toast at that spot (an undo bar, say) joins the same queue rather than drawing
 * itself, or the two would overlap.
 *
 * Plain JavaScript with no dependency on Vue, so it runs in Node tests; StatusToast.vue is its one user here.
 */

/**
 * Where a toast is drawn: one StatusToast instance.
 *
 * @typedef {object} ToastScreen
 * @property {(message: string, onDrawn: () => void) => Promise<void>} display Draws the message, calls `onDrawn` once it is on
 *   the page (that is when a screen reader announces it), and resolves once it has left the page again.
 */

/**
 * One message asking for its turn.
 *
 * @typedef {object} ToastRequest
 * @property {ToastScreen} screen The instance that will draw it.
 * @property {string} message What it says.
 * @property {() => void} settle Resolves the promise `request` returned; called once the message is drawn or dropped.
 */

/**
 * How many messages may wait behind the one on screen. A toast is news about something that just happened, so a long line of
 * them is stale news. At 4 seconds each, 3 waiting means the last one appears about 12 seconds after it was asked for (16 in
 * all with the one showing): enough for a quick burst of different actions, short of a minute-long backlog.
 */
export const MAX_WAITING_TOASTS = 3;

/**
 * Makes a queue of toasts. The page shares one (`toastQueue`); tests make their own to start from empty.
 *
 * @param {number} [maxWaiting] How many messages may wait behind the one on screen; the oldest waiting ones are dropped first.
 * @returns {{
 *   request: (screen: ToastScreen, message: string) => Promise<void>,
 *   leave: (screen: ToastScreen) => void,
 * }} `request` asks for a turn; `leave` is for a screen that is going away.
 */
export function createToastQueue(maxWaiting = MAX_WAITING_TOASTS) {
  /** @type {ToastRequest[]} Oldest first. */
  let waiting = [];
  /** @type {ToastRequest | null} The one on screen now. */
  let onScreen = null;

  /** Shows a request now and, when its screen reports it has gone, moves on to the next one. */
  function start(/** @type {ToastRequest} */ toast) {
    onScreen = toast;
    toast.screen.display(toast.message, toast.settle).then(() => finish(toast));
  }

  /** Moves on after a toast has left, unless it was already released (its screen went away) and replaced. */
  function finish(/** @type {ToastRequest} */ toast) {
    if (onScreen !== toast) return;
    onScreen = null;
    startNext();
  }

  /** Starts the longest-waiting request, if any. */
  function startNext() {
    const next = waiting.shift();
    if (next !== undefined) start(next);
  }

  /** Drops the oldest waiting requests until no more than `maxWaiting` are left, never the one on screen. */
  function dropBeyondLimit() {
    while (waiting.length > maxWaiting) {
      const dropped = /** @type {ToastRequest} */ (waiting.shift());
      dropped.settle();
    }
  }

  /**
   * Asks for a turn. The message is shown at once when nothing is on screen, otherwise it waits behind the others. A message
   * identical to one already waiting is not queued again, so a burst of the same news is shown once; the same message as the
   * one on screen is queued, so it shows again after it.
   *
   * @param {ToastScreen} screen The instance that draws the message.
   * @param {string} message What the toast says.
   * @returns {Promise<void>} Resolves when the message is on the page, or when it was dropped or merged and never will be.
   */
  function request(screen, message) {
    return new Promise((settle) => {
      if (onScreen === null) {
        start({ screen, message, settle });
        return;
      }
      const isAlreadyWaiting = waiting.some((toast) => toast.message === message);
      if (isAlreadyWaiting) {
        settle();
        return;
      }
      waiting.push({ screen, message, settle });
      dropBeyondLimit();
    });
  }

  /**
   * Forgets everything a screen asked for, for when it is unmounted (the page changed): its waiting messages are dropped, and
   * if it is the one showing, the next toast starts at once.
   *
   * @param {ToastScreen} screen The instance going away.
   */
  function leave(screen) {
    const [theirs, others] = partition(waiting, (toast) => toast.screen === screen);
    waiting = others;
    theirs.forEach((toast) => toast.settle());

    if (onScreen !== null && onScreen.screen === screen) {
      onScreen.settle();
      onScreen = null;
      startNext();
    }
  }

  return { request, leave };
}

/**
 * Splits a list in two by a test, keeping the order.
 *
 * @template T
 * @param {T[]} items The list to split.
 * @param {(item: T) => boolean} passes The test.
 * @returns {[T[], T[]]} The items that pass, then the ones that do not.
 */
function partition(items, passes) {
  /** @type {T[]} */
  const passing = [];
  /** @type {T[]} */
  const failing = [];
  for (const item of items) {
    (passes(item) ? passing : failing).push(item);
  }
  return [passing, failing];
}

/** The queue every StatusToast on the page shares. */
export const toastQueue = createToastQueue();

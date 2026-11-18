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
 * The state one queue keeps between calls. Its helpers below take it as their first argument, so each one reads and changes
 * only the fields it names.
 *
 * @typedef {object} ToastQueueState
 * @property {number} maxWaiting How many messages may wait behind the one on screen.
 * @property {ToastRequest[]} waiting The requests waiting for their turn, oldest first.
 * @property {ToastRequest | null} onScreen The request on screen now, or null when the screen is empty.
 */

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
  /** @type {ToastQueueState} */
  const state = { maxWaiting, waiting: [], onScreen: null };
  return {
    request: (screen, message) => requestTurn(state, screen, message),
    leave: (screen) => leaveScreen(state, screen),
  };
}

/**
 * Asks for a turn. The message is shown at once when nothing is on screen, otherwise it waits behind the others. A message
 * identical to one already waiting is not queued again, so a burst of the same news is shown once; the same message as the
 * one on screen is queued, so it shows again after it.
 *
 * @param {ToastQueueState} state The queue asked.
 * @param {ToastScreen} screen The instance that draws the message.
 * @param {string} message What the toast says.
 * @returns {Promise<void>} Resolves when the message is on the page, or when it was dropped or merged and never will be.
 */
function requestTurn(state, screen, message) {
  return new Promise((settle) => {
    if (state.onScreen === null) {
      showToast(state, { screen, message, settle });
      return;
    }
    // A repeat of a message already waiting adds nothing the reader does not already have coming.
    const isAlreadyWaiting = state.waiting.some((toast) => toast.message === message);
    if (isAlreadyWaiting) {
      settle();
      return;
    }
    state.waiting.push({ screen, message, settle });
    dropBeyondLimit(state);
  });
}

/**
 * Forgets everything a screen asked for, for when it is unmounted (the page changed): its waiting messages are dropped, and
 * if it is the one showing, the next toast starts at once.
 *
 * @param {ToastQueueState} state The queue the screen was using.
 * @param {ToastScreen} screen The instance going away.
 */
function leaveScreen(state, screen) {
  const [theirs, others] = partition(state.waiting, (toast) => toast.screen === screen);
  state.waiting = others;
  theirs.forEach((toast) => toast.settle());

  if (state.onScreen !== null && state.onScreen.screen === screen) {
    // Settling releases the request's promise now, so the caller is not left waiting on a screen that no longer exists.
    state.onScreen.settle();
    state.onScreen = null;
    showNextToast(state);
  }
}

/**
 * Shows a request now and, when its screen reports it has gone, moves on to the next one.
 *
 * @param {ToastQueueState} state The queue showing it.
 * @param {ToastRequest} toast The request to show.
 */
function showToast(state, toast) {
  state.onScreen = toast;
  toast.screen.display(toast.message, toast.settle).then(() => finishToast(state, toast));
}

/**
 * Moves on after a toast has left, unless it was already released (its screen went away) and replaced.
 *
 * @param {ToastQueueState} state The queue the toast was on.
 * @param {ToastRequest} toast The toast that has left the page.
 */
function finishToast(state, toast) {
  if (state.onScreen !== toast) return;
  state.onScreen = null;
  showNextToast(state);
}

/**
 * Shows the longest-waiting request, if any; with none waiting, the screen stays empty.
 *
 * @param {ToastQueueState} state The queue to advance.
 */
function showNextToast(state) {
  const next = state.waiting.shift();
  if (next !== undefined) showToast(state, next);
}

/**
 * Drops the oldest waiting requests until no more than `maxWaiting` are left, never the one on screen.
 *
 * @param {ToastQueueState} state The queue to trim.
 */
function dropBeyondLimit(state) {
  while (state.waiting.length > state.maxWaiting) {
    const dropped = /** @type {ToastRequest} */ (state.waiting.shift());
    dropped.settle();
  }
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

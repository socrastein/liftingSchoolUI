/**
 * Makes a queue of toasts. The page shares one (`toastQueue`); tests make their own to start from empty.
 *
 * @param {number} [maxWaiting] How many messages may wait behind the one on screen; the oldest waiting ones are dropped first.
 * @returns {{
 *   request: (screen: ToastScreen, message: string) => Promise<void>,
 *   leave: (screen: ToastScreen) => void,
 * }} `request` asks for a turn; `leave` is for a screen that is going away.
 */
export function createToastQueue(maxWaiting?: number): {
    request: (screen: ToastScreen, message: string) => Promise<void>;
    leave: (screen: ToastScreen) => void;
};
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
export const MAX_WAITING_TOASTS: 3;
/** The queue every StatusToast on the page shares. */
export const toastQueue: {
    request: (screen: ToastScreen, message: string) => Promise<void>;
    leave: (screen: ToastScreen) => void;
};
/**
 * Where a toast is drawn: one StatusToast instance.
 */
export type ToastScreen = {
    /**
     * Draws the message, calls `onDrawn` once it is on
     * the page (that is when a screen reader announces it), and resolves once it has left the page again.
     */
    display: (message: string, onDrawn: () => void) => Promise<void>;
};
/**
 * One message asking for its turn.
 */
export type ToastRequest = {
    /**
     * The instance that will draw it.
     */
    screen: ToastScreen;
    /**
     * What it says.
     */
    message: string;
    /**
     * Resolves the promise `request` returned; called once the message is drawn or dropped.
     */
    settle: () => void;
};

/**
 * Marks user-facing writing that an AI assistant drafted and the owner has not yet rewritten. Writing that readers take as the
 * owner's own words (blog posts, the about page, service descriptions) must be theirs; drafts exist only so a page can be built,
 * tested and reviewed before its words are final.
 *
 * How it works:
 * - At runtime the wrapper changes nothing: the dev server, the browser tests and the preview all show the draft.
 * - `check-placeholder-copy` (see placeholderCopyCheck.js) lists every call of it and exits 1 while any remain. A project runs
 *   that check where a draft must not get through: the deploy, never a push, so a branch can hold drafts while the owner
 *   rewrites them.
 * - The owner rewrites the text and removes the wrapper. Nobody else removes a wrapper from text the owner has not written.
 *
 * The check looks for the function's name followed by an opening parenthesis, so a comment must mention the wrapper by name
 * only (as here), never written as a call, or the check flags the comment.
 */
/**
 * Wraps drafted user-facing text so the deploy refuses to ship it until it has been rewritten by hand.
 *
 * @param {string} text The draft text.
 * @returns {string} The same text, unchanged.
 */
export function placeholderCopy(text: string): string;

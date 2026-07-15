// Plain module — NOT 'use server'.
//
// These live here rather than in actions.ts because a "use server" file may only
// export async functions. Next.js turns such a module into server-action
// references for any client importer, so a plain array export silently arrives as
// `undefined` on the client — which blew up ItemRail the moment a logged-in user
// rendered the category <select>.
//
// Values mirror the tagger's prompt (lib/gemini.ts SYSTEM) so hand edits and AI
// tags stay in the same language. They are guidance there and free text in the DB,
// so rows may hold off-vocabulary values (the OpenRouter fallback writes category
// 'other') — always offer the row's current value too, via withCurrent().
export const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'ethnic']
export const OCCASIONS = ['casual', 'work', 'party', 'formal', 'gym', 'travel', 'ethnic', 'date', 'beach', 'loungewear']
export const SEASONS = ['summer', 'winter', 'monsoon', 'all-season']

/** Offer the vocabulary plus whatever the row already holds, so a <select> can't corrupt it. */
export function withCurrent(list: string[], current: string | null | undefined): string[] {
  return current && !list.includes(current) ? [current, ...list] : list
}

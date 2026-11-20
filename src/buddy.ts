// The child's animal lives at the top left of every screen and reacts to what the child does:
// a jump when something is finished, a puzzled tilt when a piece doesn't fit.

export type BuddyMood = 'yay' | 'hmm'

/** Tell the buddy something happened (any screen may call this). */
export function buddy(mood: BuddyMood) {
  window.dispatchEvent(new CustomEvent<BuddyMood>('buddy', { detail: mood }))
}

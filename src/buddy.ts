// The child's animal lives at the top left of every screen and reacts to what the child does:
// a little bob when a sound is tapped, a big happy bounce when something is finished, a puzzled
// tilt when a piece doesn't fit.

export type BuddyMood = 'tap' | 'yay' | 'hmm'

/** Tell the buddy something happened (any screen may call this). */
export function buddy(mood: BuddyMood) {
  window.dispatchEvent(new CustomEvent<BuddyMood>('buddy', { detail: mood }))
}

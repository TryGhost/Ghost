// Creating an automation in this lane — phase 2's model, carried over for a team
// demo: DEFERRED. The list navigates to the /new sentinel, the detail screen
// synthesizes a blank baseline, and nothing exists in the store until the first
// Save or Turn on. Backing out creates nothing.
//
// Its own constant rather than an import from phase-2/creation-variant: the
// phase lanes are frozen for eng, and a sandbox depending on their files is how
// a change meant for one lane reaches another.
export const NEW_AUTOMATION_ID = 'new';

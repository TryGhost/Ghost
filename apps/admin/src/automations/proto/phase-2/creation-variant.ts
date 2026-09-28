// PHASE 2's creation model: DEFERRED — nothing exists until the first Save or
// Publish. Decided after a stretch as a three-way switchable slot (create on
// arrival, draft until save, a create-button-on-the-trigger fallback): eng
// confirmed fake-until-first-save is buildable, so the alternatives came out
// of this lane. They live in this branch's history, and the future lane still
// carries the switch, if the decision ever reopens.

// The sentinel id the list navigates to. The record's REAL id is minted by
// blankAutomation the moment the detail screen synthesizes its baseline —
// this is only what the URL says until the first commit swaps it out.
export const NEW_AUTOMATION_ID = 'new';

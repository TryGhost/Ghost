# Verified Email Combobox UX Refinement

## Problem

The VerifiedEmailSelect combobox has a two-mode UX: browse mode and add mode. Users must click "Add new email..." to switch to add mode before typing a new address. This is clunky — the add mode replaces the entire list, and if you dismiss it you lose your input.

## Design

Collapse into a single unified mode. As the user types:

1. Existing verified/pending emails are fuzzy-filtered by the search input
2. An "Add [typed-text]" item appears at the bottom whenever the input is non-empty and doesn't exactly match an existing verified email
3. If no existing emails match, "Add [typed-text]" becomes the only (default) option
4. Selecting "Add [typed-text]" triggers verification via the API
5. Special options and "Manage verified emails..." remain as-is

## Changes

- Remove `addMode` and `newEmail` state from `VerifiedEmailSelect`
- Remove the conditional branch that renders a separate add-mode UI
- Add a dynamic "Add [search]" `CommandItem` that uses `forceMount` to bypass cmdk filtering
- Track the search input via cmdk's `onValueChange` on `CommandInput`
- Use the search value directly when calling `handleAddEmail`

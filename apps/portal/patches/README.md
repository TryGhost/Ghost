# Portal patches

This directory contains patch-package patches for the `@tryghost/portal` workspace.

## How patches work

Patches in this package are applied automatically after install via the `postinstall` script:

```json
"postinstall": "patch-package"
```

## Create or update a patch
```bash
# From this workspace
cd apps/portal
npx patch-package <package-name>
```

## Apply patches
- Running `patch-package` from this workspace will apply patches in this directory.
- If applying patches from the repo root, ensure your tooling also picks up workspace patch dirs, or move this patch to the root `patches/` if needed.

## Current patches

### `input-otp+1.4.2.patch`
- **Package**: `input-otp@1.4.2`
- **Purpose**: Make the library iframe-aware by using the input element’s `ownerDocument` and its `defaultView` (instead of the top-level `document/window`) for selection handling, focus checks, style injection, and `ResizeObserver`. This ensures caret/arrow navigation works inside the portal iframe modal.

What’s changed (high-level):
- Use `input.ownerDocument` for:
  - Adding/removing `selectionchange` listeners
  - Checking `activeElement`
  - Calling `elementFromPoint` in password-manager badge logic
  - Injecting CSS into the correct document head
  - Creating `ResizeObserver` via `ownerDocument.defaultView.ResizeObserver` when available
- Dispatch `selectionchange` on the same `ownerDocument` instead of the top-level `document`.

Updated files in `node_modules` before generating the patch:
- `apps/portal/node_modules/input-otp/dist/index.mjs`
- `apps/portal/node_modules/input-otp/dist/index.js`

#### Testing
- Verify OTP input inside the portal iframe modal:
  - Overwrite the last slot by typing additional digits
  - Arrow-left/right across all slots
  - Click individual slots and confirm the caret/active slot state updates

#### Upstream references and diffs
- Upstream reference: [`input-otp` package code](https://github.com/guilhermerodz/input-otp/tree/master/packages/input-otp)

We keep the upstream behavior intact and only scope DOM access to the input’s owning document/context. Concretely, these changes correspond to the following upstream source locations (names may differ slightly across versions/builds):

- File: `packages/input-otp/src/index.tsx` (OTPInput component)
  - Selection/caret tracking effect (the effect that reads `activeElement`, selection range, and subscribes to `selectionchange`):
    - Replace global `document`/`window` usage with the input’s owner document/context.
    - Before:
      ```ts
      document.addEventListener('selectionchange', onSel, {capture: true});
      if (document.activeElement === input) { /* ... */ }
      const style = document.getElementById('input-otp-style') || document.createElement('style');
      const ro = new ResizeObserver(update);
      ```
    - After:
      ```ts
      const doc = input.ownerDocument || document;
      const win = doc.defaultView || window;
      doc.addEventListener('selectionchange', onSel, {capture: true});
      if (doc.activeElement === input) { /* ... */ }
      const style = doc.getElementById('input-otp-style') || doc.createElement('style');
      const ro = new (win.ResizeObserver || ResizeObserver)(update);
      ```
  - Change handler (the branch that dispatches a synthetic selection update when the controlled value shrinks):
    - Before:
      ```ts
      document.dispatchEvent(new Event('selectionchange'));
      ```
    - After:
      ```ts
      const doc = input.ownerDocument || document;
      doc.dispatchEvent(new Event('selectionchange'));
      ```

- File: `packages/input-otp/src/*` (password manager badge logic for `pushPasswordManagerStrategy`)
  - Where the code checks for overlapping password-manager UI using `querySelectorAll` and `elementFromPoint`:
    - Before:
      ```ts
      document.querySelectorAll(PWM_SELECTORS)
      document.elementFromPoint(x, y)
      const space = window.innerWidth - rect.right
      ```
    - After:
      ```ts
      const doc = input.ownerDocument || document;
      const win = doc.defaultView || window;
      doc.querySelectorAll(PWM_SELECTORS)
      doc.elementFromPoint(x, y)
      const space = win.innerWidth - rect.right
      ```

Files affected (dist):
- `apps/portal/node_modules/input-otp/dist/index.mjs`
- `apps/portal/node_modules/input-otp/dist/index.js`

Notes:
- We deliberately do not change any public API or slot computation logic; the patch only ensures the DOM events and queries use the correct (iframe) document.

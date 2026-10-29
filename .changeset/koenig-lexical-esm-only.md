---
"@tryghost/koenig-lexical": major
---

Removed the UMD/CommonJS build; the package is now ESM-only. `main` and the package's `.` export point at `dist/koenig-lexical.js`, and `dist/koenig-lexical.umd.js` is no longer published. Import the editor as an ES module and its styles from `@tryghost/koenig-lexical/style.css`.

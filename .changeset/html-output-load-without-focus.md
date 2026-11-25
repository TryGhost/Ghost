---
"@tryghost/koenig-lexical": patch
---

Fixed `HtmlOutputPlugin` taking focus when it loads its initial HTML. Loading left a selection behind, which Lexical set in the page; the browser then focused the editor and scrolled it into view, so remounting an editor such as the feature image caption pulled the page to it.

console.log('Hello world!', import.meta);

// The demo is loaded via ESM, but normally the script is loaded via a <script> tag, using a UMD bundle.
// The script on itself expects document.currentScript to be set, but this is not the case when loaded via ESM.
// So we map it manually here

const scriptTag = document.querySelector('script');
document.currentScript = scriptTag;

import('../src/index.tsx');

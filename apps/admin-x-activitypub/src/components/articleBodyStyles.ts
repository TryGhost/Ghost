const articleBodyStyles = () => {
    return `<style>

/* Variables */

:root {
    --color-white: #fff;
    --color-lighter-gray: rgb(0 0 0 / 0.05);
    --color-light-gray: #e6e6e6;
    --color-mid-gray: #ccc;
    --color-dark-gray: #444;
    --color-darker-gray: #15171a;
    --color-black: #000;
    --color-primary-text: var(--color-darker-gray);
    --color-secondary-text: rgb(124 139 154);
    --color-border: rgb(0 0 0 / 0.08);
    --color-dark-border: rgb(0 0 0 / 0.55);
    --background-color: #fff;
    --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    --font-serif: "EB Garamond", Georgia, Times, serif;
    --font-serif-alt: Georgia, Times, serif;
    --font-mono: "JetBrains Mono", Menlo, Consolas, Monaco, "Liberation Mono", "Lucida Console", monospace;
    --letter-spacing: 0;
    --container-width: 1320px;
    --container-gap: clamp(24px, 1.7032rem + 1.9355vw, 48px);
    --ghost-accent-color: #15171a;
}

:root.has-light-text,
:is(.gh-navigation, .gh-footer).has-accent-color {
    --color-lighter-gray: rgb(255 255 255 / 0.1);
    --color-darker-gray: #fff;
    --color-secondary-text: rgb(255 255 255 / 0.64);
    --color-border: rgb(255 255 255 / 0.15);
    --color-dark-border: rgb(255 255 255 / 0.5);
    --background-color: #15171a;
}

/* Resets */

*, *::before, *::after {
    box-sizing: border-box;
}

* {
    margin: 0;
}

html {
    font-size: 62.5%;
}

body {
    font-family: var(--font-sans);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

img, picture, video, canvas, svg {
    display: block;
    height: auto;
    max-width: 100%;
}

iframe {
    display: block;
}

input, button, textarea, select {
    font: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
    overflow-wrap: break-word;
}

h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-sans);
    line-height: 1.2;
}

/* Globals */

html {
    --container-width: 840px;
    --content-width: 640px;
}

body {
    font-family: var(--font-sans);
    font-size: 1.6rem;
    background-color: var(--background-color);
    color: var(--color-primary-text);
}

a {
    color: var(--color-darker-gray);
    text-decoration: none;
}

a:not([class]):hover {
    opacity: 0.8;
}

.gh-canvas,
.kg-width-full.kg-content-wide {
    --main: min(var(--content-width, 720px), 100% - var(--container-gap) * 2);
    --wide: minmax(0, calc((var(--container-width, 1200px) - var(--content-width, 720px)) / 2));
    --full: minmax(var(--container-gap), 1fr);

    display: grid;
    grid-template-columns:
        [full-start] var(--full)
        [wide-start] var(--wide)
        [main-start] var(--main) [main-end]
        var(--wide) [wide-end]
        var(--full) [full-end];
}

.gh-canvas > * {
    grid-column: main;
}

.kg-width-wide,
.kg-content-wide > div {
    grid-column: full;
}

.kg-width-full {
    grid-column: full;
}

/* Article */

.gh-article-header {
    margin: 24px 0 40px;
}

.gh-article-title {
    font-weight: 700;
    text-wrap: pretty;
    font-size: 3.6rem;
    letter-spacing: -0.015em;
    line-height: 1.1;
}

.gh-article-excerpt {
    margin-top: 12px;
    font-size: calc(var(--font-size) * 1.06 * var(--font-size-multiplier, 1));
    line-height: 1.4;
    text-wrap: pretty;
}

.has-serif-body .gh-article-excerpt {
    font-family: var(--font-serif-alt);
}

.gh-article-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
}

.gh-article-meta:hover {
    opacity: 1;
}

.gh-article-author-image {
    display: flex;
    margin-right: 8px;
    margin-left: 6px;
}

.gh-article-author-image span {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 46px;
    height: 46px;
    overflow: hidden;
    margin: 0 -8px;
    background-color: #F4F5F6;
    border-radius: 50%;
    border: 3px solid var(--background-color);
}

html.has-sepia-bg .gh-article-author-image span {
    background-color: #EFEDE6;
}

html.has-light-text .gh-article-author-image span {
    background-color: #394047;
}

.gh-article-author-image span:first-child {
    z-index: 10;
}

.gh-article-author-image span:nth-child(2) {
    z-index: 9;
}

.gh-article-author-image span:nth-child(3) {
    z-index: 8;
}

.gh-article-author-image img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.gh-article-author-image svg {
    width: 18px;
    height: 18px;
    color: #95A1AD;
}

.gh-article-meta-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-top: -2px;
}

.gh-article-author-name {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.008em;
}

.gh-article-source {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 1.5rem;
    line-height: 1.2;
    color: var(--color-secondary-text);
    width: fit-content;
}

.gh-article-source svg {
    width: 12px;
    height: 12px;
    margin-top: 1px;
}

.gh-article-meta:hover .gh-article-source {
    text-decoration: underline;
}

.gh-article-image {
    grid-column: full;
    margin-top: 40px;
}

.gh-article-image img {
    width: 100%;
}

/* Content */

/* Content refers to styling all page and post content that is
created within the Ghost editor. The main content handles
headings, text, images and lists. We deal with cards lower down. */

.gh-content {
    font-size: calc(var(--font-size) * var(--font-size-multiplier, 1));
    overflow-x: hidden;
    letter-spacing: var(--letter-spacing);
    line-height: var(--line-height);
}

/* Default vertical spacing */
.gh-content > * + * {
    margin-top: calc(28px * var(--content-spacing-factor, 1));
    margin-bottom: 0;
}

/* Remove space between full-width cards */
.gh-content > .kg-width-full + .kg-width-full:not(.kg-width-full.kg-card-hascaption + .kg-width-full) {
    margin-top: 0;
}

/* Add back a top margin to all headings,
unless a heading is the very first element in the post content */
.gh-content > [id]:not(:first-child) {
    margin-top: calc(40px * var(--content-spacing-factor, 1));
}

/* Add a small margin between a heading and paragraph after it */
.gh-content > [id] + p {
    margin-top: calc(12px * var(--content-spacing-factor, 1));
}

/* A larger margin before/after dividers, blockquotes and embeds */
.gh-content > :is(hr, blockquote, iframe) {
    position: relative;
    margin-top: calc(48px * var(--content-spacing-factor, 1)) !important;
}

.gh-content > :is(hr, blockquote, iframe) + * {
    margin-top: calc(48px * var(--content-spacing-factor, 1)) !important;
}

/* Now the content typography styles */
.gh-content [id] {
    letter-spacing: -0.005em;
}

.gh-content h1 {
    font-size: 1.9em;
}

.gh-content h2 {
    font-size: 1.6em;
}

.gh-content h3 {
    font-size: 1.3em;
}

.gh-content h4 {
    font-size: 1.2em;
}

.gh-content h5 {
    font-size: 1.1em;
}

.gh-content h6 {
    font-size: 1em;
}

.gh-content a:not([class]) {
    color: #14B8FF;
    text-decoration: underline;
}

html.has-light-text .gh-content a:not([class]) {
    color: #14B8FF;
}

html.has-sepia-bg .gh-content a:not([class]) {
    color: #DD6B02;
}

.gh-content .kg-callout-card .kg-callout-text,
.gh-content .kg-toggle-card .kg-toggle-content > :is(ul, ol, p) {
    font-size: 0.95em;
}

.has-serif-body .gh-content > blockquote,
.has-serif-body .gh-content > ol,
.has-serif-body .gh-content > ul,
.has-serif-body .gh-content > dl,
.has-serif-body .gh-content > p,
.has-serif-body .gh-content .kg-callout-text,
.has-serif-body .gh-content .kg-toggle-content > ol,
.has-serif-body .gh-content .kg-toggle-content > ul,
.has-serif-body .gh-content .kg-toggle-content > p {
    font-family: var(--font-serif-alt);
}

.gh-content :is(ul, ol) {
    padding-left: 28px;
}

.gh-content :is(li + li, li :is(ul, ol)) {
    margin-top: 8px;
}

.gh-content ol ol li {
    list-style-type: lower-alpha;
}

.gh-content ol ol ol li {
    list-style-type: lower-roman;
}

.gh-content hr {
    width: 100%;
    height: 1px;
    background-color: var(--color-border);
    border: 0;
}

.gh-content .gh-table {
    overflow-x: scroll;
    -webkit-overflow-scrolling: touch;
}

.gh-content .gh-table table {
    width: 100%;
    font-family: var(--font-sans);
    font-size: 1.5rem;
    white-space: nowrap;
    vertical-align: top;
    border-spacing: 0;
    border-collapse: collapse;
}

.gh-content .gh-table table th {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-darkgrey);
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.2px;
}

.gh-content .gh-table table :is(th, td),
.gh-content .gh-table table td {
    padding: 6px 12px;
    border-bottom: 1px solid var(--color-border);
}

.gh-content .gh-table table :is(th, td):first-child {
    padding-left: 0;
}

.gh-content .gh-table table :is(th, td):last-child {
    padding-right: 0;
}

.gh-content pre {
    overflow: auto;
    padding: 16px;
    font-size: 1.5rem;
    line-height: 1.5em;
    background: var(--color-lighter-gray);
    border-radius: 6px;
    font-family: var(--font-mono);
}

.gh-content :not(pre) > code {
    vertical-align: baseline;
    padding: 0.15em 0.4em;
    font-weight: 400;
    font-size: 0.95em;
    line-height: 1em;
    background: var(--color-lighter-gray);
    border-radius: 0.25em;
    font-family: var(--font-mono);
}

.gh-content mark {
    color: inherit;
    background: rgb(255 225 54 / 25%);
}

/* Cards */

/* Add extra margin before/after any cards, except for when immediately preceeded by a heading */

.gh-content :not(.kg-card):not(table):not([id]) + :is(.kg-card, table) {
    margin-top: calc(48px * var(--content-spacing-factor, 1));
}

.gh-content :is(.kg-card, table) + :not(.kg-card):not(table):not([id]) {
    margin-top: calc(48px * var(--content-spacing-factor, 1));
}

.gh-content :not(.kg-card):not([id]) + .kg-card.kg-width-full {
    margin-top: calc(68px * var(--content-spacing-factor, 1));
}

.gh-content .kg-card.kg-width-full + :not(.kg-card):not([id]) {
    margin-top: calc(68px * var(--content-spacing-factor, 1));
}

.kg-image {
    margin-right: auto;
    margin-left: auto;
}

.kg-embed-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.kg-image-card a:hover,
.kg-gallery-image a:hover {
    opacity: 1 !important;
}

blockquote:not([class]) {
    padding-left: 2rem;
    border-left: 4px solid var(--ghost-accent-color);
}

blockquote.kg-blockquote-alt {
    font-style: normal;
    font-weight: 400;
    color: var(--color-secondary-text);
}

.has-serif-body .kg-header-card h3.kg-header-card-subheader {
    font-family: var(--font-serif);
}

.has-serif-body .kg-product-card-description :is(p, ul, ol) {
    font-family: var(--font-serif-alt);
}

/* Caption */

figcaption {
    margin-top: 12px;
    font-size: 1.3rem;
    text-align: center;
}

.kg-card.kg-width-full figcaption {
    padding: 0 16px;
}

figcaption a {
    color: rgb(29 78 216);
    text-decoration: underline;
}

/* Paid content styles */

.gh-paid-content-notice {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 36px;
    background: rgba(0, 0, 0, 0.035);
    border-radius: 14px;
    font-size: 16px;
}

html.has-light-text .gh-paid-content-notice {
    background: rgba(255, 255, 255, 0.035);
}

.gh-paid-content-notice h3 {
    letter-spacing: -0.015em !important;
}

.gh-paid-content-notice p {
    max-width: 350px;
    text-align: center;
    line-height: 1.3em;
}

.gh-paid-content-cta {
    display: block;
    color: var(--background-color) !important;
    background: var(--color-primary-text);
    text-decoration: none !important;
    font-weight: 600;
    font-size: 0.9em;
    padding: 8px 16px;
    margin-top: 8px;
    border-radius: 6px;
}

/* Design settings /*

.has-serif-body {
    --font-size-multiplier: 1.1;
}

.has-serif-body .gh-content > blockquote,
.has-serif-body .gh-content > ol,
.has-serif-body .gh-content > ul,
.has-serif-body .gh-content > dl,
.has-serif-body .gh-content > p,
.has-serif-body .gh-content .kg-callout-card .kg-callout-text,
.has-serif-body .gh-content .kg-toggle-card .kg-toggle-content > ol,
.has-serif-body .gh-content .kg-toggle-card .kg-toggle-content > ul,
.has-serif-body .gh-content .kg-toggle-card .kg-toggle-content > p {
    font-family: var(--font-serif-alt);
}

</style>`;
};

export default articleBodyStyles;

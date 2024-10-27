const articleBodyStyles = (siteUrl: string|undefined) => {
    return `<style>
    /* Table of contents
/* ------------------------------------------------------------

This is a development CSS file which is built to a minified
production stylesheet in assets/built/screen.css

1. Variables
2. Fonts
3. Resets
4. Globals
5. Layout
6. Navigation
  6.1. Navigation styles
  6.2. Navigation layouts
  6.3. Dropdown menu
  6.4. Mobile menu
7. Card
8. Header
  8.1. Magazine layout
  8.2. Highlight layout
  8.3. Classic layout
9. CTA
10. Featured posts
11. Container
  11.1. With sidebar
  11.2. Without sidebar
12. Post list
  12.1. List style
  12.2. Grid style
  12.3. No image list
13. Sidebar
14. Post/page
  14.1. Article
  14.2. Page template
  14.3. Page without header
15. Content
16. Cards
17. Comments
18. Recent posts
19. Archive
20. Design settings
21. Footer
  21.1. Footer styles
  21.2. Footer bar
  21.3. Footer signup
22. Lightbox

*/

/* 1. Variables
/* ---------------------------------------------------------- */

:root {
    --color-white: #fff;
    --color-lighter-gray: rgb(0 0 0 / 0.05);
    --color-light-gray: #e6e6e6;
    --color-mid-gray: #ccc;
    --color-dark-gray: #444;
    --color-darker-gray: #15171a;
    --color-black: #000;
    --color-primary-text: var(--color-darker-gray);
    --color-secondary-text: rgb(0 0 0 / 0.55);
    --color-border: rgb(0 0 0 / 0.08);
    --color-dark-border: rgb(0 0 0 / 0.55);
    --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    --font-serif: "EB Garamond", Georgia, Times, serif;
    --font-serif-alt: Georgia, Times, serif;
    --font-mono: "JetBrains Mono", Menlo, Consolas, Monaco, "Liberation Mono", "Lucida Console", monospace;
    --container-width: 1320px;
    --container-gap: clamp(24px, 1.7032rem + 1.9355vw, 48px);
    --grid-gap: 42px;
}

:root.has-light-text,
:is(.gh-navigation, .gh-footer).has-accent-color {
    --color-lighter-gray: rgb(255 255 255 / 0.1);
    --color-darker-gray: #fff;
    --color-secondary-text: rgb(255 255 255 / 0.64);
    --color-border: rgb(255 255 255 / 0.15);
    --color-dark-border: rgb(255 255 255 / 0.5);
}

/* 2. Fonts
/* ---------------------------------------------------------- */

@font-face {
    font-family: "Inter";
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url(../fonts/inter-roman.woff2) format("woff2");
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
    font-family: "EB Garamond";
    font-style: normal;
    font-weight: 400 800;
    font-display: swap;
    src: url(../fonts/eb-garamond-roman.woff2) format("woff2");
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
    font-family: "EB Garamond";
    font-style: italic;
    font-weight: 400 800;
    font-display: swap;
    src: url(../fonts/eb-garamond-italic.woff2) format("woff2");
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
    font-family: "JetBrains Mono";
    font-style: normal;
    font-weight: 100 800;
    font-display: swap;
    src: url(../fonts/jetbrains-mono-roman.woff2) format("woff2");
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
    font-family: "JetBrains Mono";
    font-style: italic;
    font-weight: 100 800;
    font-display: swap;
    src: url(../fonts/jetbrains-mono-italic.woff2) format("woff2");
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* 3. Resets
/* ---------------------------------------------------------- */

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
    line-height: 1.6;
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
    line-height: 1.2;
}

/* 4. Globals
/* ---------------------------------------------------------- */

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

a:hover {
    opacity: 0.8;
}

.gh-button {
    display: inline-flex;
    gap: 0.4em;
    align-items: center;
    justify-content: center;
    padding: 0.8em 1.4em;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.004em;
    line-height: 1;
    color: var(--color-white);
    cursor: pointer;
    background-color: var(--ghost-accent-color);
    border: 0;
    border-radius: 100px;
}

.gh-button:hover {
    opacity: 0.95;
}

.gh-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--color-darker-gray);
    cursor: pointer;
    background-color: transparent;
    border: 0;
    outline: none;
}

.gh-icon-button:hover :is(svg, span) {
    opacity: 0.8;
}

.gh-icon-button svg {
    width: 20px;
    height: 20px;
}

.gh-form {
    display: flex;
    align-items: center;
    position: relative;
    max-width: 560px;
    width: 100%;
    height: 56px;
    font-size: 1.7rem;
    font-weight: 450;
    letter-spacing: -0.008em;
    border-radius: 40px;
    background-color: var(--color-lighter-gray);
    transition: background-color 0.2s ease;
}

.gh-form.success {
    pointer-events: none;
}

.gh-form.error {
    box-shadow: 0 0 0 1px red;
}

.gh-form:hover {
    background-color: rgb(0 0 0 / 0.065);
}

.has-light-text .gh-form:hover,
.gh-footer.has-accent-color .gh-form:hover {
    background-color: rgb(255 255 255 / 0.15);
}

.gh-form-input {
    position: absolute;
    inset: 0;
    padding-inline: 26px;
    width: 100%;
    height: 100%;
    font-size: inherit;
    letter-spacing: inherit;
    line-height: 1.1;
    border: 0;
    background-color: transparent;
    outline: none;
    transition: 0.3s ease-in-out;
}

.gh-form-input::placeholder,
button.gh-form-input {
    color: rgb(0 0 0 / 0.3);
}

:is(.has-serif-title, .has-mono-title) .gh-form-input {
    padding-inline: 20px;
}

.gh-form.gh-form.success .gh-form-input {
    opacity: 0.5;
}

.has-light-text .gh-form-input,
.gh-footer.has-accent-color .gh-form-input {
    color: #fff;
}

.has-light-text .gh-form-input::placeholder,
.has-light-text button.gh-form-input,
.gh-footer.has-accent-color .gh-form-input::placeholder {
    color: rgb(255 255 255 / 0.55);
}

.gh-header.is-classic.has-image .gh-form-input {
    color: #15171a;
}

.gh-header.is-classic.has-image .gh-form-input::placeholder,
.gh-header.is-classic.has-image button.gh-form-input,
.gh-header.is-classic.has-image .gh-form > svg {
    color: rgb(0 0 0 / 0.5);
}

button.gh-form-input {
    padding-inline-start: 56px;
    text-align: left;
    color: var(--color-secondary-text);
    cursor: pointer;
}

:is(.has-serif-title,.has-mono-title) button.gh-form-input {
    padding-inline-start: 50px;
}

.gh-form .gh-button {
    position: absolute;
    right: 6px;
    padding-inline: 32px;
    height: 44px;
    font-size: inherit;
}

.gh-form > svg {
    position: relative;
    left: 22px;
    width: 20px;
    height: 20px;
    color: var(--color-secondary-text);
}

:is(.has-serif-title,.has-mono-title) .gh-form > svg {
    left: 16px;
}

.gh-form .gh-button svg {
    display: none;
    position: absolute;
    margin-top: 1px;
}

.gh-form:is(.loading, .success) .gh-button span {
    visibility: hidden;
}

.gh-form.loading .gh-button svg:first-of-type {
    display: block;
}

.gh-form.success .gh-button svg:last-of-type {
    display: block;
}

.gh-form [data-members-error] {
    position: absolute;
    top: 100%;
    margin-top: 10px;
    width: 100%;
    font-size: 1.4rem;
    line-height: 1.4;
}

@media (max-width: 576px) {
    .gh-form {
        font-size: 1.6rem;
    }

    .gh-form .gh-button {
        padding-inline: 12px;
    }

    .gh-form .gh-button span span {
        display: none;
    }

    .gh-form .gh-button span svg {
        display: inline;
        position: static;
        margin-top: 2px;
        width: 20px;
        height: 20px;
    }
}

/* 5. Layout
/* ---------------------------------------------------------- */

.gh-viewport {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

.gh-outer {
    padding: 0 max(4vmin, 20px);
}

.gh-outer .gh-outer {
    padding: 0;
}

.gh-inner {
    margin: 0 auto;
    max-width: var(--container-width);
    width: 100%;
}

.gh-main {
    flex-grow: 1;
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
    grid-column: wide;
}

.kg-width-full {
    grid-column: full;
}

.kg-article-container {
    padding-bottom: 4.8rem;
}

/* 6. Navigation
/* ---------------------------------------------------------- */

.gh-navigation {
    height: 100px;
    font-size: 1.5rem;
    font-weight: 550;
    background-color: var(--background-color);
    color: var(--color-darker-gray);
}

.gh-navigation :is(.gh-navigation-logo, a:not(.gh-button), .gh-icon-button) {
    color: inherit;
}

.gh-navigation-inner {
    display: grid;
    grid-auto-flow: row dense;
    column-gap: 24px;
    align-items: center;
    height: 100%;
}

.gh-navigation-brand {
    line-height: 1;
}

.gh-navigation-logo {
    position: relative;
    font-size: calc(2.4rem * var(--factor, 1));
    font-weight: 725;
    letter-spacing: -0.015em;
    white-space: nowrap;
}

.gh-navigation-logo img {
    max-height: 40px;
}

.gh-navigation-menu {
    display: flex;
    gap: 24px;
    align-items: center;
}

.gh-navigation .nav {
    display: inline-flex;
    gap: 28px;
    align-items: center;
    padding: 0;
    margin: 0;
    white-space: nowrap;
    list-style: none;
}

.gh-navigation .gh-more-toggle {
    position: relative;
    margin: 0 -6px;
    font-size: inherit;
    text-transform: inherit;
}

.gh-navigation .gh-more-toggle svg {
    width: 24px;
    height: 24px;
}

.gh-navigation-actions {
    display: flex;
    gap: 24px;
    align-items: center;
    justify-content: flex-end;
    background-color: var(--background-color);
}

.gh-navigation.has-accent-color .gh-navigation-actions {
    background-color: var(--ghost-accent-color);
}

.gh-navigation-members {
    display: flex;
    gap: 20px;
    align-items: center;
    white-space: nowrap;
}

.gh-navigation-members .gh-button {
    font-size: inherit;
    font-weight: 600;
}

.gh-search {
    margin-right: -2px;
    margin-left: -2px;
}

@media (max-width: 767px) {
    .gh-navigation-logo {
        white-space: normal;
    }

    .gh-navigation-members {
        flex-direction: column-reverse;
        gap: 16px;
        width: 100%;
    }

    .gh-navigation-actions .gh-search {
        display: none;
    }
}

@media (min-width: 768px) {
    .gh-navigation-brand .gh-search {
        display: none;
    }

    .gh-navigation:not(.is-dropdown-loaded) .gh-navigation-menu .nav > li {
        opacity: 0;
    }
}

/* 6.1. Navigation styles */

.gh-navigation.has-accent-color {
    background-color: var(--ghost-accent-color);
}

.gh-navigation.has-accent-color .gh-button {
    background-color: #fff;
    color: #15171a;
}

/* 6.2. Navigation layouts */

/*
======================================================================
LOGO   Home About Collection Author Portal             Login Subscribe
======================================================================
*/

.gh-navigation.is-left-logo .gh-navigation-inner {
    grid-template-columns: auto 1fr auto;
}

@media (min-width: 768px) {
    .gh-navigation.is-left-logo .gh-navigation-logo:not(:has(img)) {
        top: -2px;
    }
}

@media (min-width: 992px) {
    .gh-navigation.is-left-logo .gh-navigation-menu {
        margin-right: 100px;
        margin-left: 16px;
    }
}

/*
======================================================================
Home About Collection            LOGO                  Login Subscribe
======================================================================
*/

.gh-navigation.is-middle-logo .gh-navigation-inner {
    grid-template-columns: 1fr auto 1fr;
}

.gh-navigation.is-middle-logo .gh-navigation-brand {
    grid-column-start: 2;
}

.gh-navigation.is-middle-logo .gh-navigation-actions {
    gap: 28px;
}

@media (min-width: 992px) {
    .gh-navigation.is-middle-logo .gh-navigation-menu {
        margin-right: 64px;
    }
}

/*
======================================================================
Search                         LOGO                    Login Subscribe
                 Home About Collection Author Portal
======================================================================
*/

.gh-navigation.is-stacked {
    position: relative;
    height: auto;
}

.gh-navigation.is-stacked .gh-navigation-inner {
    grid-template-columns: 1fr auto 1fr;
}

.gh-navigation.is-stacked .gh-navigation-brand {
    display: flex;
    align-items: center;
    grid-row-start: 1;
    grid-column-start: 2;
    min-height: 80px;
}

@media (max-width: 767px) {
    .gh-navigation.is-stacked .gh-navigation-brand {
        min-height: unset;
    }
}

@media (min-width: 992px) {
    .gh-navigation.is-stacked .gh-navigation-inner {
        padding: 0;
    }

    .gh-navigation.is-stacked .gh-navigation-brand {
        display: flex;
        align-items: center;
        height: 80px;
    }

    .gh-navigation.is-stacked .gh-navigation-menu {
        grid-row-start: 2;
        grid-column: 1 / 4;
        justify-content: center;
        height: 60px;
        margin: 0 48px;
    }

    .gh-navigation.is-stacked .gh-navigation-menu::before,
    .gh-navigation.is-stacked .gh-navigation-menu::after {
        position: absolute;
        top: 80px;
        left: 0;
        width: 100%;
        height: 1px;
        content: "";
        background-color: var(--color-border);
    }

    .gh-navigation.is-stacked .gh-navigation-menu::after {
        top: 140px;
    }

    .gh-navigation.is-stacked .gh-navigation-actions {
        grid-row-start: 1;
        grid-column: 1 / 4;
        justify-content: space-between;
    }

    .gh-navigation.is-stacked .gh-navigation-actions .gh-search {
        display: flex;
        gap: 10px;
        width: auto;
    }
}

/* 6.3. Dropdown menu */

.gh-dropdown {
    position: absolute;
    top: 100%;
    right: -16px;
    z-index: 90;
    width: 200px;
    padding: 12px 0;
    margin-top: 24px;
    text-align: left;
    visibility: hidden;
    background-color: #fff;
    border-radius: 5px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.04), 0 7px 20px -5px rgb(0 0 0 / 0.15);
    opacity: 0;
    transition: opacity 0.3s, transform 0.2s;
    transform: translate3d(0, 6px, 0);
}

.gh-dropdown.is-left {
    right: auto;
    left: -16px;
}

.is-dropdown-mega .gh-dropdown {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-flow: column;
    column-gap: 40px;
    width: auto;
    padding: 20px 32px;
}

.is-dropdown-open .gh-dropdown {
    visibility: visible;
    opacity: 1;
    transform: translateY(0);
}

.gh-dropdown li a {
    display: block;
    padding: 7px 20px;
    line-height: 1.5;
    white-space: normal;
    color: #15171a !important;
}

.is-dropdown-mega .gh-dropdown li a {
    padding: 8px 0;
}

/* 6.4. Mobile menu */

.gh-burger {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    display: none;
    margin-right: -7px;
    margin-left: 4px;
}

.gh-burger svg {
    width: 24px;
    height: 24px;
}

.gh-burger svg:last-child {
    display: none;
}

.is-open .gh-burger svg:first-child {
    display: none;
}

.is-open .gh-burger svg:last-child {
    display: block;
}

@media (max-width: 767px) {
    .gh-burger {
        display: flex;
    }

    #gh-navigation {
        height: 64px;
    }

    #gh-navigation .gh-navigation-inner {
        grid-template-rows: auto 1fr auto;
        grid-template-columns: 1fr;
        gap: 48px;
    }

    #gh-navigation .gh-navigation-brand {
        display: grid;
        grid-template-columns: 1fr auto auto;
        grid-column-start: 1;
        align-items: center;
        height: 64px;
    }

    #gh-navigation .gh-navigation-logo {
        font-size: 2.2rem;
    }

    #gh-navigation .gh-navigation-menu,
    #gh-navigation .gh-navigation-actions {
        position: fixed;
        justify-content: center;
        visibility: hidden;
        opacity: 0;
    }

    #gh-navigation .gh-navigation-menu {
        transition: none;
        transform: translateY(0);
    }

    #gh-navigation .nav {
        gap: 20px;
        align-items: center;
        line-height: 1.4;
    }

    #gh-navigation .nav a {
        font-size: 1.75rem;
        font-weight: 600;
        text-transform: none;
    }

    #gh-navigation .nav li {
        opacity: 0;
        transform: translateY(-4px);
    }

    #gh-navigation .gh-navigation-actions {
        text-align: center;
    }

    #gh-navigation :is(.gh-button, a[data-portal="signin"]) {
        opacity: 0;
        transform: translateY(8px);
    }

    #gh-navigation .gh-button {
        width: 100%;
        font-size: 1.75rem;
        text-transform: none;
    }

    #gh-navigation a[data-portal="signin"] {
        font-size: 1.75rem;
    }

    #gh-main {
        transition: opacity 0.4s;
    }

    .is-open#gh-navigation {
        position: fixed;
        inset: 0;
        z-index: 3999999;
        height: 100%;
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
    }

    .is-open#gh-navigation .gh-navigation-menu,
    .is-open#gh-navigation .gh-navigation-actions {
        position: static;
        visibility: visible;
        opacity: 1;
    }

    .is-open#gh-navigation .nav {
        display: flex;
        flex-direction: column;
    }

    .is-open#gh-navigation .nav li {
        opacity: 1;
        transition: transform 0.2s, opacity 0.2s;
        transform: translateY(0);
    }

    .is-open#gh-navigation .gh-navigation-actions {
        position: sticky;
        right: 0;
        bottom: 0;
        left: 0;
        display: inline-flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
        padding: var(--container-gap) 0;
    }

    .is-open#gh-navigation :is(.gh-button, a[data-portal="signin"]) {
        opacity: 1;
        transition: transform 0.4s, opacity 0.4s;
        transition-delay: 0.2s;
        transform: translateY(0);
    }

    .is-open#gh-navigation a[data-portal="signin"] {
        transition-delay: 0.4s;
    }

    .is-open#gh-main {
        opacity: 0;
    }
}

/* 7. Card
/* ---------------------------------------------------------- */

.gh-card {
    position: relative;
}

.gh-card-link {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.gh-card-link:hover {
    opacity: 1;
}

.gh-card-image {
    position: relative;
    flex-shrink: 0;
    aspect-ratio: 16 / 9;
}

.gh-card-image img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.gh-card-wrapper {
    flex-grow: 1;
}

.gh-card-tag {
    display: none;
    margin-bottom: 4px;
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    text-transform: uppercase;
}

.gh-card-title {
    font-size: calc(1.9rem * var(--factor, 1));
    font-weight: 725;
    letter-spacing: -0.014em;
    line-height: 1.3;
}

.gh-card-link:hover .gh-card-title {
    opacity: 0.8;
}

.gh-card-excerpt {
    display: -webkit-box;
    overflow-y: hidden;
    margin-top: 8px;
    font-size: 1.45rem;
    line-height: 1.4;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.gh-card-meta {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    align-items: center;
    padding-bottom: 1px;
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.05;
    letter-spacing: -0.004em;
    color: var(--color-secondary-text);
}

.gh-card-meta svg {
    width: 16px;
    height: 16px;
    margin-right: 2px;
    margin-top: -2px;
}

.gh-card-meta:not(:empty) {
    margin-top: 12px;
}

.gh-card-author + .gh-card-date::before {
    content: "—";
    margin-right: 4px;
}

/* 8. Header
/* ---------------------------------------------------------- */

.gh-header {
    position: relative;
    margin-top: 40px;
}

.gh-header-inner {
    position: relative;
    overflow: hidden;
}

/* 8.1. Magazine layout */

.gh-header.is-magazine .gh-header-inner {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: var(--grid-gap);
}

.gh-header.is-magazine .gh-header-inner > div {
    display: flex;
    flex-direction: column;
    gap: var(--grid-gap);
    grid-row: 1;
}

.gh-header.is-magazine .gh-header-left {
    grid-column: 1 / span 4;
}

.gh-header.is-magazine .gh-header-inner > .gh-card {
    position: relative;
    grid-column: 5 / span 8;
}

.gh-header.is-magazine .gh-header-right {
    grid-column: 13 / -1;
}

.gh-header.is-magazine .gh-header-inner > .gh-card .gh-card-link {
    gap: 28px;
}

.gh-header.is-magazine .gh-header-inner > .gh-card .gh-card-image {
    aspect-ratio: 1.618033;
}

.gh-header.is-magazine .gh-header-inner > .gh-card .gh-card-tag {
    display: block;
    margin-bottom: 12px;
}

.gh-header.is-magazine .gh-header-inner > .gh-card .gh-card-title {
    font-size: clamp(2.8rem, 1.36vw + 2.25rem, 4rem);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.022em;
}

.gh-header.is-magazine .gh-header-inner > .gh-card .gh-card-excerpt {
    margin-top: clamp(12px, 0.45vw + 10.18px, 16px);
    font-size: 1.8rem;
    letter-spacing: -0.02em;
    max-width: 90%;
}

.gh-header.is-magazine .gh-header-inner > .gh-card .gh-card-meta:not(:empty) {
    margin-top: 14px;
}

.gh-header.is-magazine :is(.gh-header-left, .gh-header-right) .gh-card:last-child .gh-card-image {
    display: none;
}

.gh-header.is-magazine .gh-header-inner > div .gh-card-excerpt {
    display: none;
}

.gh-header.is-magazine .gh-header-inner > .gh-card::before,
.gh-header.is-magazine .gh-header-inner > .gh-card::after {
    position: absolute;
    top: 0;
    left: calc(var(--grid-gap) / -2);
    content: "";
    width: 1px;
    height: 100%;
    background-color: var(--color-border);
}

.gh-header.is-magazine .gh-header-inner > .gh-card::after {
    right: calc(var(--grid-gap) / -2);
    left: auto;
}

.gh-header.is-magazine .gh-header-inner > div .gh-card + .gh-card::before {
    position: absolute;
    top: calc(var(--grid-gap) / -2);
    left: 0;
    content: "";
    width: 100%;
    height: 1px;
    background-color: var(--color-border);
}

@media (max-width: 1199px) {
    .gh-header.is-magazine .gh-header-inner {
        grid-template-columns: repeat(12, 1fr);
    }

    .gh-header.is-magazine .gh-header-inner > .gh-card {
        grid-column: 1 / span 8;
    }

    .gh-header.is-magazine .gh-header-left {
        grid-column: 9 / -1;
    }

    .gh-header.is-magazine .gh-header-inner > div.gh-header-right {
        grid-column: 1 / -1;
        grid-row: 2;
        flex-direction: row;
    }

    .gh-header.is-magazine .gh-header-right .gh-card {
        flex: 1;
    }

    .gh-header.is-magazine .gh-header-right .gh-card:last-child .gh-card-image {
        display: block;
    }

    .gh-header.is-magazine .gh-header-right {
        position: relative;
    }

    .gh-header.is-magazine .gh-header-right::before {
        position: absolute;
        top: calc(var(--grid-gap) / -2);
        left: 0;
        content: "";
        width: 100%;
        height: 1px;
        background-color: var(--color-border);
    }

    .gh-header.is-magazine .gh-header-right .gh-card::before {
        display: none;
    }

    .gh-header.is-magazine .gh-header-right .gh-card::after {
        position: absolute;
        top: 0;
        right: calc(var(--grid-gap) / -2);
        content: "";
        width: 1px;
        height: 100%;
        background-color: var(--color-border);
    }
}

@media (max-width: 991px) {
    .gh-header.is-magazine .gh-header-left .gh-card:nth-child(2) .gh-card-image {
        display: none;
    }
}

@media (max-width: 767px) {
    .gh-header.is-magazine .gh-header-inner {
        display: flex;
        flex-direction: column;
        gap: var(--grid-gap);
    }

    .gh-header.is-magazine .gh-header-inner > div.gh-header-right {
        flex-direction: column;
    }

    .gh-header.is-magazine .gh-card-image {
        display: block !important;
    }

    .gh-header.is-magazine .gh-card::before {
        display: block !important;
        position: absolute;
        top: calc(var(--grid-gap) / -2);
        left: 0;
        content: "";
        width: 100%;
        height: 1px;
        background-color: var(--color-border);
    }
}

/* 8.2. Highlight layout */

.gh-header.is-highlight .gh-header-inner {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: var(--grid-gap);
}

.gh-header.is-highlight .gh-header-left {
    position: relative;
    grid-column: span 8;
}

.gh-header.is-highlight .gh-header-left .gh-card {
    grid-column: span 8;
    grid-row: span 3;
}

.gh-header.is-highlight .gh-header-left .gh-card .gh-card-link {
    gap: 28px;
}

.gh-header.is-highlight .gh-header-left .gh-card .gh-card-image {
    aspect-ratio: 3 / 2;
}

.gh-header.is-highlight .gh-header-left .gh-card .gh-card-tag {
    display: block;
    margin-bottom: 12px;
}

.gh-header.is-highlight .gh-header-left .gh-card .gh-card-title {
    font-size: clamp(2.8rem, 1.36vw + 2.25rem, 4rem);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.022em;
}

.gh-header.is-highlight .gh-header-left .gh-card .gh-card-excerpt {
    margin-top: clamp(12px, 0.45vw + 10.18px, 16px);
    font-size: 1.8rem;
}

.gh-header.is-highlight .gh-header-left .gh-card .gh-card-meta:not(:empty) {
    margin-top: 14px;
}

.gh-header.is-highlight .gh-header-middle {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--grid-gap);
    grid-column: 9 / span 4;
}

.gh-header.is-highlight .gh-header-middle .gh-card:last-child .gh-card-image {
    display: none;
}

.gh-header.is-highlight .gh-header-middle .gh-card .gh-card-excerpt {
    display: none;
}

.gh-header.is-highlight .gh-header-right {
    grid-column: 13 / -1;
}

.gh-header.is-highlight .gh-featured {
    margin-top: 0;
    padding: 0;
}

.gh-header.is-highlight .gh-featured-feed {
    display: flex;
    flex-direction: column;
}

.gh-header.is-highlight .gh-featured-feed .gh-card-title {
    font-size: clamp(1.4rem, 0.23vw + 1.31rem, 1.6rem);
}

.gh-header.is-highlight .gh-header-left::after,
.gh-header.is-highlight .gh-header-middle::after {
    position: absolute;
    top: 0;
    right: calc(var(--grid-gap) / -2);
    content: "";
    width: 1px;
    height: 100%;
    background-color: var(--color-border);
}

.gh-header.is-highlight .gh-card::before {
    position: absolute;
    top: calc(var(--grid-gap) / -2);
    left: 0;
    content: "";
    width: 100%;
    height: 1px;
    background-color: var(--color-border);
}

.gh-header.is-highlight .gh-featured .gh-card:first-child::before {
    display: none;
}

@media (max-width: 1199px) {
    .gh-header.is-highlight .gh-header-inner {
        grid-template-columns: repeat(9, 1fr);
    }

    .gh-header.is-highlight .gh-header-left {
        grid-column: span 6;
    }

    .gh-header.is-highlight .gh-header-middle {
        grid-column: 7 / -1;
    }

    .gh-header.is-highlight .gh-header-right {
        grid-column: 1 / -1;
    }

    .gh-header.is-highlight .gh-featured-feed {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
    }

    .gh-header.is-highlight .gh-featured-feed .gh-card:before {
        width: calc(100% + var(--grid-gap));
    }

    .gh-header.is-highlight .gh-featured-feed .gh-card::after {
        position: absolute;
        top: 0;
        left: calc(var(--grid-gap) / -2);
        content: "";
        width: 1px;
        height: 100%;
        background-color: var(--color-border);
    }
}

@media (max-width: 991px) {
    .gh-header.is-highlight .gh-header-middle .gh-card:nth-child(2) .gh-card-image {
        display: none;
    }
}

@media (max-width: 767px) {
    .gh-header.is-highlight .gh-header-inner {
        display: flex;
        flex-direction: column;
    }

    .gh-header.is-highlight .gh-featured-feed {
        display: flex;
        /* gap: var(--grid-gap); */
    }

    .gh-header.is-highlight .gh-card-image {
        display: block !important;
    }

    .gh-header.is-highlight .gh-header-middle .gh-card .gh-card-excerpt {
        display: -webkit-box;
    }
}

/* 8.3. Classic layout */

.gh-header.is-classic {
    display: flex;
    margin-top: 0;
    padding-block: 160px;
}

.gh-header.is-classic .gh-header-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 48px;
    overflow: unset;
    margin: auto;
    max-width: 1020px;
    text-align: center;
}

.gh-header.is-classic .gh-header-title {
    font-size: calc(clamp(3rem, 1.82vw + 2.27rem, 4.6rem) * var(--factor, 1));
    line-height: 1.1;
    letter-spacing: -0.028em;
}

.gh-header.is-classic.has-image {
    margin-top: 0;
}

.gh-header.is-classic.has-image::before {
    position: absolute;
    inset: 0;
    content: "";
    opacity: 0.3;
    background-color: var(--color-black);
    transition: opacity 1.5s ease;
}

.gh-header.is-classic.has-image .gh-header-inner {
    color: #fff;
}

.gh-header.is-classic.has-image .gh-header-image {
    position: absolute;
    inset: 0;
    z-index: -1;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.gh-header.is-classic.has-image .gh-form {
    background-color: #fff;
}

/* 9. CTA
/* ---------------------------------------------------------- */

.gh-cta {
    display: none;
    margin-top: max(4vw, 40px);
}

.gh-header:is(.is-highlight, .is-magazine) + .gh-cta {
    display: block;
}

.gh-cta-inner {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 36px;
    padding: clamp(48px, 3.64vw + 33.45px, 80px) clamp(40px, 2.73vw + 29.09px, 64px);
    text-align: center;
    background-color: var(--color-lighter-gray);
}

.gh-cta-content {
    max-width: 640px;
}

.gh-cta-title {
    font-size: clamp(2.8rem,1.36vw + 2.25rem,4rem);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.021em;
}

.gh-cta-description {
    margin-top: 12px;
    font-size: 1.8rem;
    line-height: 1.4;
    letter-spacing: -0.015em;
}

/* 10. Featured posts
/* ---------------------------------------------------------- */

.gh-featured {
    margin-top: 100px;
}

.gh-navigation + .gh-featured {
    margin-top: 64px;
}

.gh-header.is-classic:not(.has-image) + .gh-featured {
    margin-top: 0;
}

.gh-featured-inner {
    overflow: hidden;
}

.gh-featured-title {
    margin-bottom: 20px;
    padding-bottom: 12px;
    font-size: 1.2rem;
    font-weight: 550;
    letter-spacing: 0.025em;
    text-transform: uppercase;
    border-bottom: 1px solid var(--color-border);
}

.gh-featured-feed {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--grid-gap);
}

.gh-featured-feed .gh-card {
    container-type: inline-size;
    container-name: featured-card;
}

.gh-featured-feed .gh-card-link {
    display: flex;
    flex-direction: row-reverse;
    align-items: flex-start;
}

.gh-featured-feed .gh-card-image {
    width: 72px;
    aspect-ratio: 1;
}

@container featured-card (width < 240px) {
    .gh-featured-feed .gh-card-image {
        display: none;
    }
}

@container featured-card (240px <= width <= 270px) {
    .gh-featured-feed .gh-card-image {
        width: 64px;
    }
}

.gh-featured-feed .gh-card-wrapper {
    container-type: inline-size;
    container-name: featured-card-wrapper;
}

.gh-featured-feed .gh-card-title {
    font-size: 1.6rem;
    font-weight: 650;
    letter-spacing: -0.011em;
}

@container featured-card-wrapper (width < 170px) {
    .gh-featured-feed .gh-card-title {
        font-size: 1.6rem;
    }
}

.gh-featured-feed .gh-card-excerpt {
    display: none;
}

.gh-featured-feed .gh-card-meta:not(:empty) {
    margin-top: 10px;
}

.gh-featured-feed .gh-card::before {
    position: absolute;
    top: 0;
    left: calc(var(--grid-gap) / -2);
    content: "";
    width: 1px;
    height: 100%;
    background-color: var(--color-border);
}

@media (max-width: 1199px) {
    .gh-viewport > .gh-featured .gh-featured-feed {
        grid-template-columns: repeat(3, 1fr);
    }

    .gh-viewport > .gh-featured .gh-featured-feed .gh-card:nth-child(4) {
        display: none;
    }
}

@media (max-width: 767px) {
    .gh-viewport > .gh-featured .gh-featured-feed {
        display: flex;
        flex-direction: column;
    }
}

/* 11. Container
/* ---------------------------------------------------------- */

.gh-container {
    flex-grow: 1;
    margin-top: 64px;
}

.gh-container-inner {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    column-gap: var(--grid-gap);
}

:is(.gh-featured, .gh-cta) + .gh-container {
    margin-top: max(4vw, 40px);
}

.gh-header.is-classic:not(.has-image) + .gh-container {
    margin-top: 0;
}

.gh-navigation + .gh-container .gh-container-title,
:is(.paged, .tag-template, .author-template) .gh-container:not(.has-sidebar) .gh-container-title {
    display: none;
}

.gh-more {
    display: none;
    grid-column: 1 / -1;
    margin-top: 48px;
    font-size: calc(1.9rem * var(--factor, 1));
    font-weight: 725;
    letter-spacing: -0.014em;
}

.gh-container.has-sidebar .gh-more {
    grid-column: span 12;
}

.home-template .gh-more {
    display: block;
}

.gh-more a {
    display: flex;
    align-items: center;
    gap: 4px;
}

.gh-more svg {
    margin-top: -1px;
    width: 18px;
    height: 18px;
}

.has-serif-title .gh-more svg {
    margin-top: 0;
}

/* 11.1. With sidebar */

.gh-container.has-sidebar .gh-main {
    grid-column: 1 / span 12;
    position: relative;
}

.gh-container.has-sidebar .gh-sidebar {
    grid-column: 13 / -1;
}

.gh-container.has-sidebar .gh-main::after {
    position: absolute;
    top: 0;
    right: calc(var(--grid-gap) / -2);
    content: "";
    width: 1px;
    height: 100%;
    background-color: var(--color-border);
}

/* 11.2. Without sidebar */

.gh-container:not(.has-sidebar) :is(.gh-container-title, .gh-main, .gh-more) {
    grid-column: 3 / span 12;
}

.gh-container.is-list.no-image:not(.has-sidebar) :is(.gh-container-title, .gh-main, .gh-more) {
    grid-column: 4 / span 10;
}

.gh-header:is(.is-highlight, .is-magazine) ~ .gh-container.is-grid:not(.has-sidebar) :is(.gh-container-title, .gh-main, .gh-more) {
    grid-column: 1 / -1;
}

@media (max-width: 1199px) {
    .gh-container-inner {
        display: block;
        overflow: hidden;
    }

    .gh-container.has-sidebar .gh-sidebar {
        display: none;
    }
}

/* 12. Post list
/* ---------------------------------------------------------- */

.gh-container-title {
    grid-column: 1 / -1;
    margin-bottom: calc(var(--grid-gap) / 2);
    padding-bottom: 12px;
    font-size: 1.2rem;
    font-weight: 550;
    letter-spacing: 0.025em;
    text-transform: uppercase;
    border-bottom: 1px solid var(--color-border);
}

.gh-container:not(:has(.gh-card)) .gh-container-title {
    display: none;
}

.gh-container .gh-feed {
    gap: var(--grid-gap);
}

.gh-container .gh-card-meta:not(:empty) {
    margin-top: 16px;
}

/* 12.1. List style */

.gh-container.is-list .gh-feed {
    display: flex;
    flex-direction: column;
    container-type: inline-size;
    container-name: list-feed;
}

.gh-container.is-list .gh-card-link {
    flex-direction: row;
    align-items: center;
    gap: 24px;
}

.gh-container.is-list .no-image .gh-card-link {
    padding-block: 20px;
}

.gh-container.is-list .gh-card-image {
    flex-shrink: 0;
    width: 220px;
    aspect-ratio: 1.618033;
}

@container list-feed (width < 600px) {
    .gh-container.is-list .gh-card-image {
        width: 160px;
    }
}

.gh-container.is-list .gh-card:not(.no-image) .gh-card-wrapper {
    max-width: 600px;
}

.gh-container.is-list .gh-card-title {
    --factor: 1.05;
}

.gh-container.is-list .no-image .gh-card-title {
    --factor: 1.2;
}

.gh-container.is-list .gh-card-excerpt {
    margin-top: 6px;
}

.gh-container.is-list .gh-card + .gh-card::before {
    position: absolute;
    top: calc(var(--grid-gap) / -2);
    left: 0;
    content: "";
    width: 100%;
    height: 1px;
    background-color: var(--color-border);
}

.home-template .gh-container.is-list .gh-card:first-child:before {
    display: none;
}

@media (max-width: 767px) {
    .gh-container.is-list .gh-card-link {
        flex-direction: column;
        align-items: flex-start;
    }

    .gh-container.is-list .gh-card-image {
        width: 100%;
    }
}

/* 12.2. Grid style */

.gh-container.is-grid .gh-feed {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(248px, 1fr));
    row-gap: calc(var(--grid-gap) * 1.5);
    overflow: hidden;
}

.gh-container.is-grid .gh-card::before {
    position: absolute;
    top: calc(var(--grid-gap) / -2);
    right: calc(var(--grid-gap) / -2);
    left: calc(var(--grid-gap) / -2);
    content: "";
    height: 1px;
    background-color: var(--color-border);
}

.gh-container.is-grid .gh-card::after {
    position: absolute;
    top: 0;
    left: calc(var(--grid-gap) / -2);
    content: "";
    width: 1px;
    height: 100%;
    background-color: var(--color-border);
}

@media (max-width: 767px) {
    .gh-container.is-grid .gh-feed {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 576px) {
    .gh-container.is-grid .gh-feed {
        display: flex;
        flex-direction: column;
    }
}

/* 12.3. No image list */

.gh-container.is-list.no-image .gh-card-image {
    display: none;
}

/* 13. Sidebar
/* ---------------------------------------------------------- */

.gh-sidebar-inner {
    position: sticky;
    top: calc(var(--grid-gap) / 2);
}

.gh-sidebar-title {
    grid-column: 1 / -1;
    margin-bottom: calc(var(--grid-gap) / 2);
    padding-bottom: 12px;
    font-size: 1.2rem;
    font-weight: 550;
    letter-spacing: 0.025em;
    text-transform: uppercase;
    border-bottom: 1px solid var(--color-border);
}

.gh-about {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 48px 24px;
    min-height: 380px;
    text-align: center;
    background-color: var(--color-lighter-gray);
}

.gh-about-icon {
    margin-bottom: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
}

.gh-about-title {
    font-size: calc(2.4rem * var(--factor, 1));
    font-weight: 700;
    letter-spacing: -0.019em;
}

.gh-about-description {
    margin-top: 12px;
    font-size: 1.45rem;
    line-height: 1.4;
}

.gh-about .gh-button {
    margin-top: 32px;
}

.gh-recommendations {
    margin-top: 48px;
}

.gh-recommendations .recommendations {
    display: flex;
    flex-direction: column;
    gap: 26px;
    margin: 0;
    padding: 0;
    list-style-type: none;
}

.gh-recommendations .recommendation:first-child {
    margin-top: 4px;
}

.gh-recommendations .recommendation a {
    display: grid;
    grid-template-columns: 24px auto;
    gap: 4px 12px;
}

.gh-recommendations .recommendation a:hover {
    opacity: 1;
}

.gh-recommendations .recommendation-favicon {
    grid-row: span 2;
    width: 100%;
    border-radius: 4px;
}

.gh-recommendations .recommendation-title {
    margin-top: -2px;
    font-size: 1.5rem;
    font-weight: 650;
    letter-spacing: -0.009em;
}

.gh-recommendations .recommendation a:hover .recommendation-title {
    opacity: 0.8;
}

.gh-recommendations .recommendation-url {
    order: 1;
    overflow: hidden;
    font-size: 1.4rem;
    line-height: 1.25;
    color: var(--color-secondary-text);
    text-overflow: ellipsis;
}

.gh-recommendations .recommendation-description {
    display: -webkit-box;
    display: none;
    overflow-y: hidden;
    grid-column: 2;
    font-size: 1.4rem;
    line-height: 1.4;
    color: var(--color-secondary-text);
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.gh-recommendations button {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-top: 24px;
    padding: 0;
    cursor: pointer;
    font-size: 1.2rem;
    font-weight: 550;
    letter-spacing: 0.025em;
    text-transform: uppercase;
    background-color: transparent;
    border: 0;
}

.gh-recommendations button svg {
    margin-top: -1px;
    width: 12px;
}

.gh-recommendations button:hover {
    opacity: 0.8;
}

/* 14. Post/page
/* ---------------------------------------------------------- */

/* 14.1. Article */

.gh-article {
    --container-width: 1120px;

    word-break: break-word;
}

.gh-article-header {
    margin: clamp(40px, 3.64vw + 25.45px, 72px) 0 40px;
}

.gh-article-tag {
    margin-bottom: 12px;
    font-size: 1.3rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    color: var(--ghost-accent-color);
}

.gh-article-title {
    font-size: calc(clamp(3.4rem, 1.36vw + 2.85rem, 4.6rem) * var(--factor, 1));
    line-height: 1.1;
    letter-spacing: -0.022em;
}

.gh-article-excerpt {
    margin-top: clamp(12px, 0.45vw + 10.18px, 16px);
    max-width: 720px;
    font-size: clamp(1.5rem, 0.45vw + 1.32rem, 1.9rem);
    line-height: 1.4;
    letter-spacing: -0.018em;
}

.gh-article-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 20px;
    margin-left: 6px;
}

.gh-article-author-image {
    display: flex;
    margin-right: 8px;
}

.gh-article-author-image a {
    position: relative;
    margin: 0 -8px;
    width: 56px;
    height: 56px;
    overflow: hidden;
    background-color: var(--color-light-gray);
    border-radius: 50%;
    border: 3px solid var(--background-color);
}

.gh-article-author-image a:first-child {
    z-index: 10;
}

.gh-article-author-image a:nth-child(2) {
    z-index: 9;
}

.gh-article-author-image a:nth-child(3) {
    z-index: 8;
}

.gh-article-author-image :is(img, svg) {
    position: absolute;
    inset: 0;
    object-fit: cover;
}

.gh-article-meta-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.gh-article-author-name {
    font-size: 1.6rem;
    font-weight: 650;
    letter-spacing: -0.013em;
}

.gh-article-meta-content {
    font-size: 1.35rem;
    font-weight: 500;
    line-height: 1.2;
    letter-spacing: -0.006em;
    color: var(--color-secondary-text);
}

.gh-article-image {
    grid-column: main;
    margin-top: 40px;
}

.gh-article-image img {
    width: 100%;
}

/* 14.2. Page template */

.page-template .gh-article-header {
    margin-block: 72px 32px;
}

/* 14.3. Page without header */

.page-template .gh-content:only-child > *:first-child:not(.kg-width-full) {
    margin-top: 64px;
}

.page-template .gh-content > *:last-child:not(.kg-width-full) {
    margin-bottom: 6vw;
}

.page-template .gh-footer {
    margin-top: 0;
}

/* 15. Content
/* ---------------------------------------------------------- */

/* Content refers to styling all page and post content that is
created within the Ghost editor. The main content handles
headings, text, images and lists. We deal with cards lower down. */

.gh-content {
    font-size: var(--content-font-size, 1.7rem);
    letter-spacing: -0.01em;
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
    margin-top: calc(56px * var(--content-spacing-factor, 1));
}

/* Add drop cap setting */
.post-template .gh-content.drop-cap > p:first-of-type:first-letter {
    margin :0 0.2em 0em 0;
    font-size: 3.1em;
    float:left;
    line-height: 1;
    margin-left: -1px;
    font-weight: 700;
}

.has-serif-body.post-template .gh-content.drop-cap > p:first-of-type:first-letter {
    font-size: 3.2em;
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
.gh-content h1 {
    font-size: calc(2.2em * var(--factor, 1));
    letter-spacing: -0.02em;
}

.gh-content h2 {
    font-size: calc(1.6em * var(--factor, 1));
    letter-spacing: -0.02em;
}

.gh-content h3 {
    font-size: calc(1.3em * var(--factor, 1));
    letter-spacing: -0.017em;
}

.gh-content a {
    color: var(--ghost-accent-color);
    text-decoration: underline;
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

/* 16. Cards
/* ---------------------------------------------------------- */

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

/* Image */

.kg-image {
    margin-right: auto;
    margin-left: auto;
}

/* Embed */

.kg-embed-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    position: relative; padding-top: 56.5%;
}

.kg-embed-card iframe {
    position: absolute;width: 100%;height: 100%;left: 0px;top: 0px;
}

/* Gallery */

.kg-image[width][height],
.kg-gallery-image {
    cursor: pointer;
}

.kg-image-card a:hover,
.kg-gallery-image a:hover {
    opacity: 1 !important;
}

/* Toggle */

.kg-card.kg-toggle-card .kg-toggle-heading-text {
    font-size: 2rem;
    font-weight: 700;
}

.has-serif-title .kg-toggle-card .kg-toggle-heading-text {
    font-family: var(--font-serif);
}

.has-mono-title .kg-toggle-card .kg-toggle-heading-text {
    font-family: var(--font-mono);
}

/* Callout */

.kg-callout-card.kg-card {
    border-radius: 0.25em;
}

.kg-callout-card-accent a {
    text-decoration: underline;
}

/* Blockquote */

blockquote:not([class]) {
    padding-left: 2rem;
    border-left: 4px solid var(--ghost-accent-color);
}

blockquote.kg-blockquote-alt {
    font-style: normal;
    font-weight: 400;
    color: var(--color-secondary-text);
}

/* Button */

.kg-card.kg-button-card .kg-btn {
    height: unset;
    padding: .6em 1.2em;
    text-align: center;
    font-size: 1em;
    line-height: 1.2em;
}

/* Header */

.has-serif-title .kg-card.kg-header-card h2.kg-header-card-header {
    font-family: var(--font-serif);
}

.has-mono-title .kg-card.kg-header-card h2.kg-header-card-header {
    font-family: var(--font-mono);
}

.has-serif-body .kg-header-card h3.kg-header-card-subheader {
    font-family: var(--font-serif);
}

/* Bookmark */

.kg-bookmark-card .kg-bookmark-container {
    border-radius: 0.25em !important;
}

.kg-bookmark-card .kg-bookmark-container:hover {
    opacity: 1;
}

.kg-bookmark-card .kg-bookmark-content {
    padding: 1.15em;
}

.kg-bookmark-card .kg-bookmark-title {
    font-size: 0.9em;
}

.kg-bookmark-card .kg-bookmark-description {
    max-height: none;
    margin-top: 0.3em;
    font-size: 0.8em;
}

.kg-bookmark-card .kg-bookmark-metadata {
    font-size: 0.8em;
}

.kg-bookmark-card .kg-bookmark-thumbnail img {
    border-radius: 0 0.2em 0.2em 0;
}

/* Product */

.kg-product-card.kg-card .kg-product-card-image {
    margin-bottom: 12px;
}

.kg-product-card.kg-card a.kg-product-card-button {
    height: 2.8em;
    margin-top: 12px;
}

.has-serif-title .kg-product-card.kg-card .kg-product-card-title {
    font-family: var(--font-serif);
}

.has-mono-title .kg-product-card.kg-card .kg-product-card-title {
    font-family: var(--font-mono);
}

.has-serif-body .kg-product-card-description :is(p, ul, ol) {
    font-family: var(--font-serif-alt);
}

/* File */

.kg-file-card.kg-card .kg-file-card-container {
    padding: 0.6em;
}

.kg-file-card.kg-card .kg-file-card-contents {
    margin: 4px 8px 6px;
}

.kg-file-card.kg-card .kg-file-card-metadata {
    font-size: 0.9em;
}

.kg-file-card.kg-card .kg-file-card-filesize::before {
    margin-right: 6px;
    margin-left: 6px;
}

/* Caption */

figcaption {
    margin-top: 12px;
    font-size: 1.4rem;
    text-align: center;
}

.kg-card.kg-width-full figcaption {
    padding: 0 16px;
}

figcaption a {
    color: var(--ghost-accent-color);
    text-decoration: underline;
}

/* 17. Comments
/* ---------------------------------------------------------- */

.gh-comments {
    margin-top: 48px;
}

/* 18. Recent posts
/* ---------------------------------------------------------- */

.post-template .gh-container {
    margin-top: 120px;
}

.post-template .gh-container-inner {
    display: block;
}

.post-template .gh-container.is-grid .gh-feed {
    grid-template-columns: repeat(4, 1fr);
}

.post-template .gh-container .gh-container-title {
    display: block;
}

/* 19. Archive
/* ---------------------------------------------------------- */

.gh-archive {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: var(--grid-gap);
    margin-block: 80px 24px;
}

.gh-archive.has-image {
    margin-top: 48px;
}

.gh-archive-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--grid-gap);
    grid-column: 1 / -1;
    padding-bottom: clamp(40px, 2.73vw + 29.09px, 64px);
    border-bottom: 1px solid var(--color-border);
}

.gh-archive.has-image .gh-archive-inner {
    align-items: center;
    grid-column: 1 / -1;
}

.gh-archive:not(.has-sidebar):not(.has-image) .gh-archive-inner {
    grid-column: 3 / span 12;
}

.gh-archive .gh-article-image {
    grid-column: auto;
    margin-top: 0;
}

:is(.tag-template, .author-template) .gh-container {
    margin-top: 0;
}

.author-template .gh-archive-inner {
    display: flex;
    flex-direction: row-reverse;
    justify-content: flex-end;
    gap: 24px;
}

.author-template .gh-article-image {
    margin-top: 0;
    width: 120px;
    height: 120px;
    border-radius: 50%;
}

.author-template .gh-article-title {
    font-size: 3.6rem;
}

.gh-author-meta {
    display: flex;
    gap: 10px;
    margin-top: 14px;
    font-size: 1.5rem;
    font-weight: 550;
    color: var(--color-secondary-text);
}

.gh-author-meta a {
    color: inherit;
}

.gh-author-social {
    display: flex;
    gap: 10px;
    align-items: center;
    padding-left: 3px;
}

.gh-author-social svg {
    width: 20px;
    height: 20px;
}

@media (max-width: 1199px) {
    .gh-archive {
        display: block;
    }
}

@media (max-width: 767px) {
    .gh-archive-inner {
        display: flex;
        flex-direction: column-reverse;
        align-items: flex-start;
    }

    .author-template .gh-archive-inner {
        flex-direction: column-reverse;
    }
}

/* 20. Design settings
/* ---------------------------------------------------------- */

.has-serif-title {
    --factor: 1.15;
}

.has-mono-title {
    --factor: 1.1;
}

.has-sans-title :is(.is-title, .gh-content :is(h2, h3)) {
    font-family: var(--font-sans);
}

.has-serif-title :is(.is-title, .gh-content :is(h2, h3)) {
    font-family: var(--font-serif);
    font-weight: 550;
}

.has-mono-title :is(.is-title, .gh-content :is(h2, h3)) {
    font-family: var(--font-mono);
}

.has-sans-body .is-body {
    font-family: var(--font-sans);
}

.has-serif-body .is-body {
    font-family: var(--font-serif-alt);
}

.has-serif-title .gh-header.is-classic .gh-header-title {
    font-weight: 550;
    letter-spacing: -0.015em;
}

.has-mono-title .gh-header.is-classic .gh-header-title {
    letter-spacing: -0.01em;
}

.has-serif-title .gh-form {
    border-radius: 0;
}

.has-serif-title .gh-card-title {
    line-height: 1.15;
    letter-spacing: -0.006em;
    font-size: calc(2.0rem*var(--factor, 1))
}

.has-serif-title .gh-featured-feed .gh-card-title {
    font-size: calc(1.6rem*var(--factor, 1))
}

.has-mono-title .gh-featured-feed .gh-card-title {
    font-size: calc(1.5rem*var(--factor, 1));
    letter-spacing: 0;
}

.has-serif-title .gh-header.is-highlight .gh-featured-feed .gh-card-title {
    font-size: clamp(1.6rem, 0.23vw + 1.51rem, 1.8rem);
}

.has-mono-title .gh-card-title {
    font-size: calc(1.8rem*var(--factor, 1));
    line-height: 1.2;
}

.has-serif-title .gh-about-title {
    letter-spacing: -0.009em;
}

.has-serif-title .gh-footer-signup-header {
    letter-spacing: -0.019em;
}

.has-serif-title .gh-article-title {
    letter-spacing: -0.019em;
}

.has-serif-body {
    --content-font-size: 1.9rem;
}

.has-serif-body .gh-card-excerpt {
    font-size: 1.65rem;
    line-height: 1.4;
    letter-spacing: 0.0005em;
}

.has-serif-body .gh-header.is-magazine .gh-header-inner > .gh-card .gh-card-excerpt,
.has-serif-body .gh-header.is-highlight .gh-card:first-child .gh-card-excerpt {
    font-size: 1.8rem;
    letter-spacing: -0.001em;
}

.has-serif-title .gh-header.is-magazine .gh-header-inner>.gh-card .gh-card-title,
.has-serif-title .gh-header.is-highlight .gh-header-left .gh-card-title {
    font-weight: 550;
    font-size: clamp(3.2rem,1.82vw + 2.47rem,4.9rem)
}

.has-serif-body .gh-about-description {
    font-size: 1.6rem;
}

.has-serif-body .gh-article-excerpt {
    letter-spacing: 0;
}

.has-serif-body .gh-footer-signup-subhead {
    letter-spacing: 0;
}

.has-serif-title :is(.gh-button, .gh-form) {
    border-radius: 0;
}

.has-mono-title :is(.gh-button) {
    border-radius: 0;
}

.has-mono-title :is(.gh-form) {
    border-radius: 0;
}

.has-serif-title .gh-cta-title {
    font-size: 4.8rem;
}

/* 21. Footer
/* ---------------------------------------------------------- */

.gh-footer {
    margin-top: 12vw;
    font-size: 1.5rem;
    color: var(--color-darker-gray);
}

.gh-footer a:not(.gh-button) {
    color: inherit;
}

/* 21.1 Footer styles */

.gh-footer.has-accent-color {
    background-color: var(--ghost-accent-color);
}

.gh-footer.has-accent-color .gh-footer-bar {
    border-top: 0;
}

.gh-footer.has-accent-color .gh-button {
    background-color: #fff;
    color: #15171a;
}

/* 21.2. Footer bar */

.gh-footer-bar {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    column-gap: 32px;
    margin-bottom: 100px;
    padding-block: 28px;
    font-weight: 550;
    border-block: 1px solid var(--color-border);
}

.gh-footer-logo {
    position: relative;
    font-size: calc(2.4rem * var(--factor, 1));
    font-weight: 725;
    letter-spacing: -0.015em;
    white-space: nowrap;
}

.gh-footer-logo img {
    max-height: 40px;
}

.gh-footer-menu .nav {
    display: flex;
    justify-content: center;
    gap: 8px 28px;
    flex-wrap: wrap;
    margin: 0;
    padding: 0;
    list-style-type: none;
}

.gh-footer-copyright {
    text-align: right;
    white-space: nowrap;
}

.gh-footer-copyright a {
    text-decoration: underline;
}

/* 21.3. Footer signup */

.gh-footer-signup {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 160px;
    text-align: center;
}

.gh-footer-signup-header {
    font-size: calc(clamp(2.8rem,1.36vw + 2.25rem,4rem) * var(--factor, 1));
    font-weight: 700;
    letter-spacing: -0.03em;
}

.gh-footer-signup-subhead {
    margin-top: 12px;
    max-width: 640px;
    font-size: 1.8rem;
    font-weight: 450;
    line-height: 1.4;
    letter-spacing: -0.014em;
    opacity: 0.75;
}

.gh-footer-signup .gh-form {
    margin-top: 40px;
}

@media (max-width: 991px) {
    .gh-footer-bar {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
}

/* 22. Lightbox
/* ---------------------------------------------------------- */

.pswp {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 3999999;
    display: none;
    width: 100%;
    height: 100%;
    overflow: hidden;
    -ms-touch-action: none;
    touch-action: none;
    outline: none;
    backface-visibility: hidden;
    -webkit-text-size-adjust: 100%;
}

.pswp img {
    max-width: none;
}

.pswp--animate_opacity {
    opacity: 0.001;
    transition: opacity 333ms cubic-bezier(0.4, 0, 0.22, 1);
    will-change: opacity;
}

.pswp--open {
    display: block;
}

.pswp--zoom-allowed .pswp__img {
    cursor: zoom-in;
}

.pswp--zoomed-in .pswp__img {
    cursor: grab;
}

.pswp--dragging .pswp__img {
    cursor: grabbing;
}

.pswp__bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.85);
    opacity: 0;
    transition: opacity 333ms cubic-bezier(0.4, 0, 0.22, 1);
    transform: translateZ(0);
    backface-visibility: hidden;
    will-change: opacity;
}

.pswp__scroll-wrap {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.pswp__container,
.pswp__zoom-wrap {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    touch-action: none;
    backface-visibility: hidden;
}

.pswp__container,
.pswp__img {
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
}

.pswp__zoom-wrap {
    position: absolute;
    width: 100%;
    transition: transform 333ms cubic-bezier(0.4, 0, 0.22, 1);
    transform-origin: left top;
}

.pswp--animated-in .pswp__bg,
.pswp--animated-in .pswp__zoom-wrap {
    transition: none;
}

.pswp__item {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    overflow: hidden;
}

.pswp__img {
    position: absolute;
    top: 0;
    left: 0;
    width: auto;
    height: auto;
}

.pswp__img--placeholder {
    backface-visibility: hidden;
}

.pswp__img--placeholder--blank {
    background: var(--color-black);
}

.pswp--ie .pswp__img {
    top: 0;
    left: 0;
    width: 100% !important;
    height: auto !important;
}

.pswp__error-msg {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    margin-top: -8px;
    font-size: 14px;
    line-height: 16px;
    color: var(--color-secondary-text);
    text-align: center;
}

.pswp__error-msg a {
    color: var(--color-secondary-text);
    text-decoration: underline;
}

.pswp__button {
    position: relative;
    display: block;
    float: right;
    width: 44px;
    height: 44px;
    padding: 0;
    margin: 0;
    overflow: visible;
    appearance: none;
    cursor: pointer;
    background: none;
    border: 0;
    box-shadow: none;
    transition: opacity 0.2s;
}

.pswp__button:focus,
.pswp__button:hover {
    opacity: 1;
}

.pswp__button:active {
    outline: none;
    opacity: 0.9;
}

.pswp__button::-moz-focus-inner {
    padding: 0;
    border: 0;
}

.pswp__ui--over-close .pswp__button--close {
    opacity: 1;
}

.pswp__button,
.pswp__button--arrow--left::before,
.pswp__button--arrow--right::before {
    width: 44px;
    height: 44px;
    background: url("../images/default-skin.png") 0 0 no-repeat;
    background-size: 264px 88px;
}

@media (-webkit-min-device-pixel-ratio: 1.1), (-webkit-min-device-pixel-ratio: 1.09375), (min-resolution: 105dpi), (min-resolution: 1.1dppx) {
    .pswp--svg .pswp__button,
    .pswp--svg .pswp__button--arrow--left::before,
    .pswp--svg .pswp__button--arrow--right::before {
        background-image: url("../images/default-skin.svg");
    }

    .pswp--svg .pswp__button--arrow--left,
    .pswp--svg .pswp__button--arrow--right {
        background: none;
    }
}

.pswp__button--close {
    background-position: 0 -44px;
}

.pswp__button--share {
    background-position: -44px -44px;
}

.pswp__button--fs {
    display: none;
}

.pswp--supports-fs .pswp__button--fs {
    display: block;
}

.pswp--fs .pswp__button--fs {
    background-position: -44px 0;
}

.pswp__button--zoom {
    display: none;
    background-position: -88px 0;
}

.pswp--zoom-allowed .pswp__button--zoom {
    display: block;
}

.pswp--zoomed-in .pswp__button--zoom {
    background-position: -132px 0;
}

.pswp--touch .pswp__button--arrow--left,
.pswp--touch .pswp__button--arrow--right {
    visibility: hidden;
}

.pswp__button--arrow--left,
.pswp__button--arrow--right {
    position: absolute;
    top: 50%;
    width: 70px;
    height: 100px;
    margin-top: -50px;
    background: none;
}

.pswp__button--arrow--left {
    left: 0;
}

.pswp__button--arrow--right {
    right: 0;
}

.pswp__button--arrow--left::before,
.pswp__button--arrow--right::before {
    position: absolute;
    top: 35px;
    width: 32px;
    height: 30px;
    content: "";
}

.pswp__button--arrow--left::before {
    left: 6px;
    background-position: -138px -44px;
}

.pswp__button--arrow--right::before {
    right: 6px;
    background-position: -94px -44px;
}

.pswp__counter {
    position: absolute;
    top: 0;
    left: 0;
    height: 44px;
    padding: 0 15px;
    font-size: 11px;
    font-weight: 700;
    line-height: 44px;
    color: var(--color-white);
    user-select: none;
}

.pswp__caption {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    min-height: 44px;
}

.pswp__caption__center {
    max-width: 420px;
    padding: 25px 15px 30px;
    margin: 0 auto;
    font-size: 11px;
    line-height: 1.6;
    color: var(--color-white);
    text-align: center;
}

.pswp__caption__center .post-caption-title {
    margin-bottom: 7px;
    font-size: 15px;
    font-weight: 500;
    text-transform: uppercase;
}

.pswp__caption__center .post-caption-meta-item + .post-caption-meta-item::before {
    padding: 0 4px;
    content: "b";
}

.pswp__caption--empty {
    display: none;
}

.pswp__caption--fake {
    visibility: hidden;
}

.pswp__preloader {
    position: absolute;
    top: 0;
    left: 50%;
    width: 44px;
    height: 44px;
    margin-left: -22px;
    opacity: 0;
    transition: opacity 0.25s ease-out;
    direction: ltr;
    will-change: opacity;
}

.pswp__preloader__icn {
    width: 20px;
    height: 20px;
    margin: 12px;
}

.pswp__preloader--active {
    opacity: 1;
}

.pswp__preloader--active .pswp__preloader__icn {
    background: url("../images/preloader.gif") 0 0 no-repeat;
}

.pswp--css_animation .pswp__preloader--active {
    opacity: 1;
}

.pswp--css_animation .pswp__preloader--active .pswp__preloader__icn {
    animation: clockwise 500ms linear infinite;
}

.pswp--css_animation .pswp__preloader--active .pswp__preloader__donut {
    animation: donut-rotate 1000ms cubic-bezier(0.4, 0, 0.22, 1) infinite;
}

.pswp--css_animation .pswp__preloader__icn {
    position: absolute;
    top: 15px;
    left: 15px;
    width: 14px;
    height: 14px;
    margin: 0;
    background: none;
    opacity: 0.75;
}

.pswp--css_animation .pswp__preloader__cut {
    position: relative;
    width: 7px;
    height: 14px;
    overflow: hidden;
}

.pswp--css_animation .pswp__preloader__donut {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    width: 14px;
    height: 14px;
    margin: 0;
    background: none;
    border: 2px solid var(--color-white);
    border-bottom-color: transparent;
    border-left-color: transparent;
    border-radius: 50%;
}

@media screen and (max-width: 1024px) {
    .pswp__preloader {
        position: relative;
        top: auto;
        left: auto;
        float: right;
        margin: 0;
    }
}

@keyframes clockwise {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

@keyframes donut-rotate {
    0% {
        transform: rotate(0);
    }

    50% {
        transform: rotate(-140deg);
    }

    100% {
        transform: rotate(0);
    }
}

.pswp__ui {
    z-index: 1550;
    visibility: visible;
    opacity: 1;
    -webkit-font-smoothing: auto;
}

.pswp__top-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 44px;
}

.pswp__caption,
.pswp__top-bar,
.pswp--has_mouse .pswp__button--arrow--left,
.pswp--has_mouse .pswp__button--arrow--right {
    backface-visibility: hidden;
    transition: opacity 333ms cubic-bezier(0.4, 0, 0.22, 1);
    will-change: opacity;
}

.pswp--has_mouse .pswp__button--arrow--left,
.pswp--has_mouse .pswp__button--arrow--right {
    visibility: visible;
}

.pswp__ui--idle .pswp__top-bar {
    opacity: 0;
}

.pswp__ui--idle .pswp__button--arrow--left,
.pswp__ui--idle .pswp__button--arrow--right {
    opacity: 0;
}

.pswp__ui--hidden .pswp__top-bar,
.pswp__ui--hidden .pswp__caption,
.pswp__ui--hidden .pswp__button--arrow--left,
.pswp__ui--hidden .pswp__button--arrow--right {
    opacity: 0.001;
}

.pswp__ui--one-slide .pswp__button--arrow--left,
.pswp__ui--one-slide .pswp__button--arrow--right,
.pswp__ui--one-slide .pswp__counter {
    display: none;
}

.pswp__element--disabled {
    display: none !important;
}

.pswp--minimal--dark .pswp__top-bar {
    background: none;
}

.kg-callout-card,
.kg-callout-card * {
    box-sizing: border-box;
}

.kg-callout-card {
    display: flex;
    padding: 1.2em 1.6em;
    border-radius: 3px;
}

.kg-callout-card-grey {
    background: rgba(124, 139, 154, 0.13);
}

.kg-callout-card-white {
    background: transparent;
    box-shadow: inset 0 0 0 1px rgba(124, 139, 154, 0.25);
}

.kg-callout-card-blue {
    background: rgba(33, 172, 232, 0.12);
}

.kg-callout-card-green {
    background: rgba(52, 183, 67, 0.12);
}

.kg-callout-card-yellow {
    background: rgba(240, 165, 15, 0.13);
}

.kg-callout-card-red {
    background: rgba(209, 46, 46, 0.11);
}

.kg-callout-card-pink {
    background: rgba(225, 71, 174, 0.11);
}

.kg-callout-card-purple {
    background: rgba(135, 85, 236, 0.12);
}

.kg-callout-card-accent {
    background: var(--ghost-accent-color);
    color: #fff;
}

.kg-callout-card.kg-callout-card-accent a {
    color: #fff;
    text-decoration: underline;
}

.kg-callout-card div.kg-callout-emoji {
    padding-right: .8em;
    line-height: 1.25em;
    font-size: 1.15em;
}

.kg-callout-card div.kg-callout-text {
    font-size: .95em;
    line-height: 1.5em;
}

.kg-callout-card + .kg-callout-card {
    margin-top: 1em;
}

.kg-audio-card,
.kg-audio-card * {
    box-sizing: border-box;
}

.kg-audio-card {
    display: flex;
    width: 100%;
    min-height: 96px;
    border-radius: 6px;
    padding: 4px;
    box-shadow: inset 0 0 0 1px rgba(124, 139, 154, 0.25);
}

.kg-audio-card+.kg-audio-card {
    margin-top: 1em;
}

.kg-audio-thumbnail {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 80px;
    min-width: 80px;
    margin: 8px;
    background: transparent;
    object-fit: cover;
    aspect-ratio: 1/1;
    border-radius: 3px;
}

.kg-audio-thumbnail.placeholder {
    background: var(--ghost-accent-color);
}

.kg-audio-thumbnail.placeholder svg {
    width: 24px;
    height: 24px;
    fill: white;
}

.kg-audio-player-container {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;
    --seek-before-width: 0%;
    --volume-before-width: 100%;
    --buffered-width: 0%;
}

.kg-audio-title {
    width: 100%;
    margin: 8px 0 0 0;
    padding: 8px 12px;
    border: none;
    font-family: inherit;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.15em;
    background: transparent;
}

.kg-audio-player {
    display: flex;
    flex-grow: 1;
    align-items: center;
    padding: 8px 12px;
}

.kg-audio-current-time {
    min-width: 38px;
    padding: 0 4px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1em;
    white-space: nowrap;
}

.kg-audio-time {
    width: 56px;
    color: #ababab;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1em;
    white-space: nowrap;
}

.kg-audio-duration {
    padding: 0 4px;
}

.kg-audio-play-icon,
.kg-audio-pause-icon {
    position: relative;
    bottom: 1px;
    padding: 0px 4px 0 0;
    font-size: 0;
    background: transparent;
}

.kg-audio-hide {
    display: none !important;
}

.kg-audio-play-icon svg,
.kg-audio-pause-icon svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
}

.kg-audio-seek-slider {
    flex-grow: 1;
    margin: 0 4px;
}

@media (max-width: 640px) {
    .kg-audio-seek-slider {
        display: none;
    }
}

.kg-audio-playback-rate {
    min-width: 37px;
    padding: 0 4px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1em;
    text-align: left;
    background: transparent;
    white-space: nowrap;
}

@media (max-width: 640px) {
    .kg-audio-playback-rate {
        padding-left: 8px;
    }
}

.kg-audio-mute-icon,
.kg-audio-unmute-icon {
    position: relative;
    bottom: -1px;
    padding: 0 4px;
    font-size: 0;
    background: transparent;
}

@media (max-width: 640px) {
    .kg-audio-mute-icon,
    .kg-audio-unmute-icon  {
        margin-left: auto;
    }
}

.kg-audio-mute-icon svg,
.kg-audio-unmute-icon svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
}

.kg-audio-volume-slider {
    width: 80px;
}

@media (max-width: 400px) {
    .kg-audio-volume-slider {
        display: none;
    }
}

.kg-audio-seek-slider::before {
    content: "";
    position: absolute;
    left: 0;
    width: var(--seek-before-width) !important;
    height: 4px;
    cursor: pointer;
    background-color: currentColor;
    border-radius: 2px;
}

.kg-audio-volume-slider::before {
    content: "";
    position: absolute;
    left: 0;
    width: var(--volume-before-width) !important;
    height: 4px;
    cursor: pointer;
    background-color: currentColor;
    border-radius: 2px;
}

/* Resetting browser styles
/* --------------------------------------------------------------- */

.kg-audio-player-container input[type=range] {
    position: relative;
    -webkit-appearance: none;
    background: transparent;
}

.kg-audio-player-container input[type=range]:focus {
    outline: none;
}

.kg-audio-player-container input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
}

.kg-audio-player-container input[type=range]::-ms-track {
    cursor: pointer;
    border-color: transparent;
    color: transparent;
    background: transparent;
}

.kg-audio-player-container button {
    display: flex;
    align-items: center;
    border: 0;
    cursor: pointer;
}

.kg-audio-player-container input[type="range"] {
    height: auto;
    padding: 0;
    border: 0;
}

/* Chrome & Safari styles
/* --------------------------------------------------------------- */

.kg-audio-player-container input[type="range"]::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: rgba(124, 139, 154, 0.25);
    border-radius: 2px;
}

.kg-audio-player-container input[type="range"]::-webkit-slider-thumb {
    position: relative;
    box-sizing: content-box;
    width: 13px;
    height: 13px;
    margin: -5px 0 0 0;
    border: 0;
    cursor: pointer;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,0.24);
}

.kg-audio-player-container input[type="range"]:active::-webkit-slider-thumb {
    transform: scale(1.2);
}

/* Firefox styles
/* --------------------------------------------------------------- */

.kg-audio-player-container input[type="range"]::-moz-range-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: rgba(124, 139, 154, 0.25);
    border-radius: 2px;
}

.kg-audio-player-container input[type="range"]::-moz-range-progress {
    background: currentColor;
    border-radius: 2px;
}

.kg-audio-player-container input[type="range"]::-moz-range-thumb {
    box-sizing: content-box;
    width: 13px;
    height: 13px;
    border: 0;
    cursor: pointer;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,0.24);
}

.kg-audio-player-container input[type="range"]:active::-moz-range-thumb {
    transform: scale(1.2);
}

/* Edge & IE styles
/* --------------------------------------------------------------- */

.kg-audio-player-container input[type="range"]::-ms-track {
    width: 100%;
    height: 3px;
    border: solid transparent;
    color: transparent;
    cursor: pointer;
    background: transparent;
}

.kg-audio-player-container input[type="range"]::-ms-fill-lower {
    background: #fff;
}

.kg-audio-player-container input[type="range"]::-ms-fill-upper {
    background: currentColor;
}

.kg-audio-player-container input[type="range"]::-ms-thumb {
    box-sizing: content-box;
    width: 13px;
    height: 13px;
    border: 0;
    cursor: pointer;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,0.24);
}

.kg-audio-player-container input[type="range"]:active::-ms-thumb {
    transform: scale(1.2);
}

.kg-blockquote-alt {
    font-size: 1.5em;
    font-style: italic;
    line-height: 1.7em;
    text-align: center;
    padding: 0 2.5em;
  }

  @media (max-width: 800px) {
    .kg-blockquote-alt {
      font-size: 1.4em;
      padding-left: 2em;
      padding-right: 2em;
    }
  }

  @media (max-width: 600px) {
    .kg-blockquote-alt {
      font-size: 1.2em;
      padding-left: 1.75em;
      padding-right: 1.75em;
    }
  }

  .kg-bookmark-card,
.kg-bookmark-card * {
    box-sizing: border-box;
}

.kg-bookmark-card,
.kg-bookmark-publisher {
    position: relative;
    /* width: 100%; */
}

.kg-bookmark-card a.kg-bookmark-container,
.kg-bookmark-card a.kg-bookmark-container:hover {
    display: flex;
    text-decoration: none;
    border-radius: 6px;
    border: 1px solid rgb(124 139 154 / 25%);
    overflow: hidden;
    color: inherit;
}

.kg-bookmark-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    flex-basis: 100%;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 20px;
    overflow: hidden;
}

.kg-bookmark-title {
    font-size: 15px;
    line-height: 1.4em;
    font-weight: 600;
}

.kg-bookmark-description {
    display: -webkit-box;
    font-size: 14px;
    line-height: 1.5em;
    margin-top: 3px;
    font-weight: 400;
    max-height: 44px;
    overflow-y: hidden;
    opacity: 0.7;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.kg-bookmark-metadata {
    display: flex;
    align-items: center;
    margin-top: 22px;
    width: 100%;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
}

.kg-bookmark-metadata > *:not(img) {
    opacity: 0.7;
}

.kg-bookmark-icon {
    width: 20px;
    height: 20px;
    margin-right: 6px;
}

.kg-bookmark-author,
.kg-bookmark-publisher {
    display: inline;
}

.kg-bookmark-publisher {
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 240px;
    white-space: nowrap;
    display: block;
    line-height: 1.65em;
}

.kg-bookmark-metadata > span:nth-of-type(2) {
    font-weight: 400;
}

.kg-bookmark-metadata > span:nth-of-type(2):before {
    content: "•";
    margin: 0 6px;
}

.kg-bookmark-metadata > span:last-of-type {
    overflow: hidden;
    text-overflow: ellipsis;
}

.kg-bookmark-thumbnail {
    position: relative;
    flex-grow: 1;
    min-width: 33%;
}

.kg-bookmark-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 0 2px 2px 0;
}

.kg-button-card,
.kg-button-card * {
    box-sizing: border-box;
}

.kg-button-card {
    display: flex;
    position: static;
    align-items: center;
    width: 100%;
    justify-content: center;
}

.kg-button-card.kg-align-left {
    justify-content: flex-start;
}

.kg-button-card a.kg-btn {
    display: flex;
    position: static;
    align-items: center;
    padding: 0 1.2em;
    height: 2.4em;
    line-height: 1em;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    font-size: 0.95em;
    font-weight: 600;
    text-decoration: none;
    border-radius: 5px;
    transition: opacity 0.2s ease-in-out;
}

.kg-button-card a.kg-btn:hover {
    opacity: 0.85;
}

.kg-button-card a.kg-btn-accent {
    background-color: var(--ghost-accent-color);
    color: #fff;
}

.kg-collection-card {
    width: 100%;
    margin-top: 6vmin;
}

.kg-collection-card + * {
    margin-top: 6vmin;
}

.kg-collection-card-title {
    margin: .8rem 0 1.6rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;
}

a.kg-collection-card-post-wrapper {
    text-decoration: none;
    color: var(--text-color);
}

a.kg-collection-card-post-wrapper:hover {
    opacity: 1;
}


.kg-collection-card-post {
    display: flex;
    gap: 3.2rem;
}

.kg-collection-card-img {
    position: relative;
    aspect-ratio: 3/2;
}

.kg-collection-card-img img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

a.kg-collection-card-post-wrapper:hover img {
    opacity: .92;
    transition: all .2s ease;
}

.kg-collection-card-content {
    display: flex;
    flex-direction: column;
    font-size: 1.6rem;
}

h2.kg-collection-card-post-title {
    margin: 0;
    font-size: 2.4rem;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}

p.kg-collection-card-post-excerpt {
    margin-top: 1.2rem;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-height: 1.4;
}

.kg-collection-card-post-meta {
    display: flex;
    opacity: .5;
    margin-top: 1.2rem;
    font-size: 1.3rem;
    font-weight: 500;
}

/* List layout */

.kg-collection-card-list {
    display: flex;
    flex-direction: column;
    gap: 3.2rem;
}

@media (max-width: 767px) {
    .kg-collection-card-list .kg-collection-card-post {
        flex-direction: column;
    }
}

.kg-collection-card-list .kg-collection-card-img {
    flex: 0 0 30%;
}

/* Grid layout */

.kg-collection-card-grid {
    display: grid;
    grid-template-columns: repeat(1,minmax(0,1fr));
    gap: 2.4rem;
}

@media (min-width: 640px) {
    .kg-collection-card-grid:not(.columns-1) {
        grid-template-columns: repeat(2,minmax(0,1fr));
    }
}

@media (min-width: 1024px) {
    .kg-collection-card-grid:not(.columns-1):not(.columns-2) {
        grid-template-columns: repeat(3,minmax(0,1fr));
        gap: 3.2rem
    }

    .kg-collection-card-grid.columns-1 {
        gap: 4.8rem
    }

    .kg-collection-card-grid.columns-2 {
        gap: 4rem
    }
}

@media (min-width: 1280px) {
    .kg-collection-card-grid:not(.columns-1):not(.columns-2):not(.columns-3) {
        grid-template-columns: repeat(4,minmax(0,1fr));
    }
}

.kg-collection-card-grid .kg-collection-card-post {
    flex-direction: column;
    gap: 1.2rem;
}

@media (min-width: 1024px) {
    .kg-collection-card-grid.columns-1 .kg-collection-card-post {
        gap: 2rem
    }

    .kg-collection-card-grid.columns-2 .kg-collection-card-post {
        gap: 1.6rem
    }
}

.kg-collection-card-grid.columns-1 .kg-collection-card-img,
.kg-collection-card-grid.columns-2 .kg-collection-card-img {
    aspect-ratio: 16/9;
}

.kg-collection-card-grid .kg-collection-card-content {
    font-size: 1.5rem;
}

@media (min-width: 640px) {
    .kg-collection-card-grid .kg-collection-card-content {
        font-size: 1.6rem;
    }
}

@media (min-width: 1024px) {
    .kg-collection-card-grid.columns-1 .kg-collection-card-content {
        font-size: 1.8rem;
    }

    .kg-collection-card-grid.columns-3 .kg-collection-card-content,
    .kg-collection-card-grid.columns-4 .kg-collection-card-content {
        font-size: 1.5rem;
    }
}

.kg-collection-card-grid h2.kg-collection-card-post-title {
    font-size: 1.7rem;
}

.kg-collection-card-grid .kg-collection-card-post-meta {
    font-size: 1.25rem;
}

@media (min-width: 640px) {
    .kg-collection-card-grid h2.kg-collection-card-post-title {
        font-size: 1.9rem;
    }

    .kg-collection-card-grid.columns-1 h2.kg-collection-card-post-title {
        font-size: 2.4rem;
    }

    .kg-collection-card-grid:not(.columns-3):not(.columns-4) .kg-collection-card-post-meta {
        font-size: 1.3rem;
    }
}

@media (min-width: 1024px) {
    .kg-collection-card-grid.columns-1 h2.kg-collection-card-post-title {
        font-size: 3.6rem;
    }

    .kg-collection-card-grid.columns-2 h2.kg-collection-card-post-title {
        font-size: 2.4rem;
    }

    .kg-collection-card-grid.columns-1 .kg-collection-card-post-meta {
        font-size: 1.4rem;
    }
}

@media (min-width: 1280px) {
    .kg-collection-card-grid.columns-4 h2.kg-collection-card-post-title {
        font-size: 1.7rem;
    }
}

.kg-file-card,
.kg-file-card * {
    box-sizing: border-box;
}

.kg-file-card {
    display: flex;
}

.kg-file-card a.kg-file-card-container {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    color: inherit;
    padding: 12px;
    min-height: 92px;
    border: 1px solid rgb(124 139 154 / 25%);
    border-radius: 5px;
    transition: all ease-in-out 0.35s;
    text-decoration: none;
    width: 100%;
}

.kg-file-card a.kg-file-card-container:hover {
    border: 1px solid rgb(124 139 154 / 35%);
}

.kg-file-card-contents {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin: 4px 8px;
    width: 100%
}

.kg-file-card-title {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3em;
}

.kg-file-card-caption {
    font-size: 14px;
    line-height: 1.3em;
    opacity: 0.7;
}

.kg-file-card-title + .kg-file-card-caption {
    flex-grow: 1;
    margin-top: 3px;
}

.kg-file-card-metadata {
    display: inline;
    font-size: 14px;
    line-height: 1.3em;
    margin-top: 5px;
}

.kg-file-card-filename {
    display: inline;
    font-weight: 500;
}

.kg-file-card-filesize {
    display: inline-block;
    font-size: 14px;
    opacity: 0.6;
}

.kg-file-card-filesize:before {
    display: inline-block;
    content: "escape";
    margin-left: 6px;
    margin-right: 6px;
}

.kg-file-card-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    min-width: 80px;
    height: 100%;
    min-height: 80px;
}

.kg-file-card-icon:before {
    position: absolute;
    display: block;
    content: "";
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: currentColor;
    opacity: 0.06;
    transition: opacity ease-in-out 0.35s;
    border-radius: 3px;
}

.kg-file-card a.kg-file-card-container:hover .kg-file-card-icon:before {
    opacity: 0.08;
}

.kg-file-card-icon svg {
    width: 24px;
    height: 24px;
    color: var(--ghost-accent-color);
}

/* Size variations */
.kg-file-card-medium a.kg-file-card-container {
    min-height: 72px;
}

.kg-file-card-medium .kg-file-card-caption {
    opacity: 1.0;
    font-weight: 500;
}

.kg-file-card-small a.kg-file-card-container {
    align-items: center;
    min-height: 52px;
}

.kg-file-card-small .kg-file-card-metadata {
    font-size: 14px;
    margin-top: 0;
}

.kg-file-card-small .kg-file-card-icon svg {
    width: 20px;
    height: 20px;
}

.kg-file-card + .kg-file-card {
    margin-top: 1em;
}

.kg-gallery-card,
.kg-gallery-card * {
    box-sizing: border-box;
}

.kg-gallery-card,
.kg-image-card {
    --gap: 1.2rem;
}

.kg-image-card:not(.kg-card-hascaption) + .kg-image-card,
.kg-image-card:not(.kg-card-hascaption) + .kg-gallery-card,
.kg-gallery-card:not(.kg-card-hascaption) + .kg-image-card,
.kg-gallery-card:not(.kg-card-hascaption) + .kg-gallery-card {
    margin-top: var(--gap);
}

.kg-gallery-container {
    position: relative;
}

.kg-gallery-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
}

.kg-gallery-image img {
    display: block;
    margin: 0;
    width: 100%;
    height: 100%;
}

.kg-gallery-row:not(:first-of-type) {
    margin: var(--gap) 0 0;
}

.kg-gallery-image:not(:first-of-type) {
    margin: 0 0 0 var(--gap);
}

@media (max-width: 600px) {
    .kg-gallery-card,
    .kg-image-card {
        --gap: 0.6rem;
    }
}

.kg-header-card,
.kg-header-card * {
    box-sizing: border-box;
}

.kg-header-card {
    padding: 12vmin 4em;
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.kg-header-card.kg-size-small {
    padding-top: 14vmin;
    padding-bottom: 14vmin;
    min-height: 40vh;
}

.kg-header-card.kg-size-large {
    padding-top: 18vmin;
    padding-bottom: 18vmin;
    min-height: 80vh;
}

.kg-header-card.kg-align-left {
    text-align: left;
    align-items: flex-start;
}

.kg-header-card.kg-style-dark {
    background: #151515;
    color: #ffffff;
}

.kg-header-card.kg-style-light {
    background-color: #fafafa;
}

.kg-header-card.kg-style-accent {
    background-color: var(--ghost-accent-color);
}

.kg-header-card.kg-style-image {
    position: relative;
    background-color: #e7e7e7;
    background-size: cover;
    background-position: center;
}

.kg-header-card.kg-style-image::before {
    position: absolute;
    display: block;
    content: "";
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.2));
}

.kg-header-card h2.kg-header-card-header {
    font-size: 5em;
    font-weight: 700;
    line-height: 1.1em;
    letter-spacing: -0.01em;
    margin: 0;
}

.kg-header-card h2.kg-header-card-header strong {
    font-weight: 800;
}

.kg-header-card.kg-size-small h2.kg-header-card-header {
    font-size: 4em;
}

.kg-header-card.kg-size-large h2.kg-header-card-header {
    font-size: 6em;
}

.kg-header-card h3.kg-header-card-subheader {
    font-size: 1.5em;
    font-weight: 500;
    line-height: 1.4em;
    margin: 0;
    max-width: 40em;
}

.kg-header-card h2 + h3.kg-header-card-subheader {
    margin: 0.35em 0 0;
}

.kg-header-card h3.kg-header-card-subheader strong {
    font-weight: 600;
}

.kg-header-card.kg-size-small h3.kg-header-card-subheader {
    font-size: 1.25em;
}

.kg-header-card.kg-size-large h3.kg-header-card-subheader {
    font-size: 1.75em;
}

.kg-header-card:not(.kg-style-light) h2.kg-header-card-header,
.kg-header-card:not(.kg-style-light) h3.kg-header-card-subheader {
    color: #ffffff;
}

.kg-header-card.kg-style-accent h3.kg-header-card-subheader,
.kg-header-card.kg-style-image h3.kg-header-card-subheader {
    opacity: 1.0;
}

.kg-header-card.kg-style-image h2.kg-header-card-header,
.kg-header-card.kg-style-image h3.kg-header-card-subheader,
.kg-header-card.kg-style-image a.kg-header-card-button {
    z-index: 999;
}

.kg-header-card h2.kg-header-card-header a,
.kg-header-card h3.kg-header-card-subheader a {
    color: var(--ghost-accent-color);
}

.kg-header-card.kg-style-accent h2.kg-header-card-header a,
.kg-header-card.kg-style-accent h3.kg-header-card-subheader a,
.kg-header-card.kg-style-image h2.kg-header-card-header a,
.kg-header-card.kg-style-image h3.kg-header-card-subheader a {
    color: #fff;
}

.kg-header-card a.kg-header-card-button {
    display: flex;
    position: static;
    align-items: center;
    fill: #fff;
    background: #fff;
    border-radius: 3px;
    outline: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    font-size: 1.05em;
    font-weight: 600;
    line-height: 1em;
    text-align: center;
    text-decoration: none;
    letter-spacing: .2px;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: #151515;
    height: 2.7em;
    padding: 0 1.2em;
    transition: opacity .2s ease;
}

.kg-header-card h2 + a.kg-header-card-button,
.kg-header-card h3 + a.kg-header-card-button {
    margin: 1.75em 0 0;
}

.kg-header-card a.kg-header-card-button:hover {
    opacity: 0.85;
}

.kg-header-card.kg-size-large a.kg-header-card-button {
    font-size: 1.1em;
    height: 2.9em;
}

.kg-header-card.kg-size-large h2 + a.kg-header-card-button,
.kg-header-card.kg-size-large h3 + a.kg-header-card-button {
    margin-top: 2em;
}

.kg-header-card.kg-size-small a.kg-header-card-button {
    height: 2.4em;
    font-size: 1em;
}

.kg-header-card.kg-size-small h2 + a.kg-header-card-button,
.kg-header-card.kg-size-small h3 + a.kg-header-card-button {
    margin-top: 1.5em;
}

.kg-header-card.kg-style-image a.kg-header-card-button,
.kg-header-card.kg-style-dark a.kg-header-card-button {
    background: #fff;
    color: #151515;
}

.kg-header-card.kg-style-light a.kg-header-card-button {
    background: var(--ghost-accent-color);
    color: #fff;
}

.kg-header-card.kg-style-accent a.kg-header-card-button {
    background: #fff;
    color: #151515;
}

@media (max-width: 640px) {
    .kg-header-card {
        padding-left: 1em;
        padding-right: 1em;
    }

    .kg-header-card h2.kg-header-card-header {
        font-size: 3.5em;
    }

    .kg-header-card.kg-size-large h2.kg-header-card-header {
        font-size: 4em;
    }

    .kg-header-card.kg-size-small h2.kg-header-card-header {
        font-size: 3em;
    }

    .kg-header-card h3.kg-header-card-subheader {
        font-size: 1.25em;
    }

    .kg-header-card.kg-size-large h3.kg-header-card-subheader {
        font-size: 1.5em;
    }

    .kg-header-card.kg-size-small h3.kg-header-card-subheader {
        font-size: 1em;
    }
}

.kg-nft-card,
.kg-nft-card * {
    box-sizing: border-box;
}

.kg-nft-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
}

.kg-nft-card a.kg-nft-card-container {
    position: static;
    display: flex;
    flex: auto;
    flex-direction: column;
    text-decoration: none;
    font-family: -apple-system, BlinkMacSystemFont,
                'avenir next', avenir,
                'helvetica neue', helvetica,
                ubuntu,
                roboto, noto,
                'segoe ui', arial,
                sans-serif;
    font-size: 14px;
    font-weight: 400;
    box-shadow: 0 2px 6px -2px rgb(0 0 0 / 10%), 0 0 1px rgb(0 0 0 / 40%);
    width: 100%;
    max-width: 512px;
    color: #222;
    background: #fff;
    border-radius: 5px;
    transition: none;
}

.kg-nft-card * {
    position: static;
}

.kg-nft-metadata {
    padding: 20px;
    width: 100%;
}

.kg-nft-image {
    border-radius: 5px 5px 0 0;
    width: 100%;
}

.kg-nft-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
}

.kg-nft-header h4.kg-nft-title {
    font-family: inherit;
    font-size: 19px;
    font-weight: 700;
    line-height: 1.3em;
    min-width: unset;
    max-width: unset;
    margin: 0;
    color: #222;
}

.kg-nft-opensea-logo {
    margin-top: 2px;
    width: 100px;
    object-fit: scale-down;
}

.kg-nft-creator {
    font-family: inherit;
    line-height: 1.4em;
    margin: 4px 0 0;
    color: #ababab;
}

.kg-nft-creator span {
    font-weight: 500;
    color: #222;
}

.kg-nft-card p.kg-nft-description {
    font-family: inherit;
    font-size: 14px;
    line-height: 1.4em;
    margin: 20px 0 0;
    color: #222;
}

.kg-product-card,
.kg-product-card * {
    box-sizing: border-box;
}

.kg-product-card {
    display: flex;
    align-items: center;
    flex-direction: column;
    width: 100%;
}

.kg-product-card-container {
    display: grid;
    grid-template-columns: auto min-content;
    align-items: center;
    grid-row-gap: 16px;
    background: transparent;
    max-width: 550px;
    padding: 20px;
    width: 100%;
    border-radius: 5px;
    box-shadow: inset 0 0 0 1px rgb(124 139 154 / 25%);
}

.kg-product-card-image {
    grid-column: 1 / 3;
    justify-self: center;
    height: auto;
}

.kg-product-card-title-container {
    grid-column: 1 / 2;
}

.kg-product-card h4.kg-product-card-title {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    text-decoration: none;
    font-weight: 600;
    font-size: 21px;
    margin-top: 0;
    margin-bottom: 0;
    line-height: 1.15em;
}

.kg-product-card-description {
    grid-column: 1 / 3;
}

.kg-product-card .kg-product-card-description p,
.kg-product-card .kg-product-card-description ol,
.kg-product-card .kg-product-card-description ul {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    font-size: 14px;
    line-height: 1.5em;
    opacity: .7;
    margin-bottom: 0;
}

.kg-product-card .kg-product-card-description p:first-of-type {
    margin-top: -4px;
}

.kg-product-card .kg-product-card-description p:not(:first-of-type),
.kg-product-card .kg-product-card-description ul,
.kg-product-card .kg-product-card-description ol {
    margin-top: 0.95em;
}

.kg-product-card .kg-product-card-description li+li {
    margin-top: 0.5em;
}

.kg-product-card-rating {
    display: flex;
    align-items: center;
    grid-column: 2 / 3;
    align-self: start;
    justify-self: end;
    padding-left: 16px;
}

@media (max-width: 400px) {
    .kg-product-card-title-container {
        grid-column: 1 / 3;
    }

    .kg-product-card-rating {
        grid-column: 1 / 3;
        justify-self: start;
        margin-top: -15px;
        padding-left: 0;
    }
}

.kg-product-card-rating-star {
    height: 20px;
    width: 20px;
}

.kg-product-card-rating-star svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
    opacity: 0.15;
}

.kg-product-card-rating-active.kg-product-card-rating-star svg {
    opacity: 1;
}

.kg-product-card a.kg-product-card-button {
    justify-content: center;
    grid-column: 1 / 3;
    display: flex;
    position: static;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    font-size: 14px;
    font-weight: 600;
    line-height: 1em;
    text-decoration: none;
    width: 100%;
    height: 38px;
    border-radius: 6px;
    padding: 0 12px;
    transition: opacity 0.2s ease-in-out;
}

.kg-product-card a.kg-product-card-btn-accent {
    background-color: var(--ghost-accent-color);
    color: #fff;
}

.kg-signup-card {
    position: relative;
}

.kg-signup-card,
.kg-signup-card * {
    box-sizing: border-box;
}

.kg-signup-card a,
.kg-signup-card a span {
    color: currentColor;
}

.kg-signup-card.kg-style-accent {
    background-color: var(--ghost-accent-color);
}

.kg-layout-split .kg-signup-card-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
}

.kg-signup-card-text {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    height: 100%;
    padding: min(4vmax, 80px);
    background-size: cover;
    background-position: center;
    text-align: left;
}

.kg-width-wide .kg-signup-card-text {
    padding: min(6.4vmax, 120px);
}

.kg-width-full .kg-signup-card-text {
    padding: min(12vmax, 260px) 0;
}

.kg-layout-split .kg-signup-card-text {
    padding: min(12vmax, 260px) min(4vmax, 80px);
}

.kg-layout-split.kg-content-wide .kg-signup-card-text {
    padding: min(10vmax, 220px) 0 min(10vmax, 220px) min(4vmax, 80px);
}

.kg-layout-split.kg-content-wide.kg-swapped .kg-signup-card-text {
    padding: min(10vmax, 220px) min(4vmax, 80px) min(10vmax, 220px) 0;
}

.kg-swapped .kg-signup-card-text {
    grid-row: 1;
}

.kg-signup-card-text.kg-align-center {
    align-items: center;
    text-align: center;
}

.kg-signup-card.kg-style-image h2.kg-signup-card-heading,
.kg-signup-card.kg-style-image .kg-signup-card-subheading,
.kg-signup-card.kg-style-image .kg-signup-card-button {
    z-index: 999;
}

/* Background image */

.kg-signup-card > picture > .kg-signup-card-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    background-color: #FFFFFF;
    pointer-events: none;
}

/* Split layout image */

.kg-signup-card-content .kg-signup-card-image {
    width: 100%;
    /* this will force the image to follow the signup card height */
    height: 0;
    min-height: 100%;
    /**/
    object-fit: cover;
    object-position: center;
}

.kg-content-wide .kg-signup-card-content .kg-signup-card-image {
    height: 100%;
    padding: 5.6em 0;
    object-fit: contain;
}

/* Heading */

.kg-signup-card h2.kg-signup-card-heading {
    margin: 0;
    font-size: clamp(1.7em, 4vw, 2.5em);
    font-weight: 700;
    line-height: 1.05em;
    letter-spacing: -0.01em;
}

.kg-signup-card.kg-width-wide h2.kg-signup-card-heading {
    font-size: clamp(1.7em, 5vw, 3.3em);
}

.kg-signup-card.kg-width-full h2.kg-signup-card-heading {
    font-size: clamp(1.9em, 5.6vw, 4.2em);
}

.kg-signup-card.kg-width-full.kg-layout-split h2.kg-signup-card-heading {
    font-size: clamp(1.9em, 4vw, 3.3em);
}

/* Subheading */

.kg-signup-card-subheading {
    margin: 0 0 2em;
}

.kg-signup-card .kg-signup-card-subheading {
    max-width: 40em;
    margin: 0;
    font-size: clamp(1.05em, 2vw, 1.4em);
    font-weight: 500;
    line-height: 1.2em;
}

.kg-signup-card h2 + .kg-signup-card-subheading {
    margin: 0.6em 0 0;
}

.kg-signup-card .kg-signup-card-subheading strong {
    font-weight: 600;
}

.kg-signup-card.kg-width-wide .kg-signup-card-subheading {
    font-size: clamp(1.05em, 2vw, 1.55em);
}

.kg-signup-card.kg-width-full .kg-signup-card-subheading:not(.kg-layout-split .kg-signup-card-subheading) {
    max-width: min(65vmax, 1200px);
    font-size: clamp(1.05em, 2vw, 1.7em);
}

.kg-signup-card.kg-width-full.kg-layout-split .kg-signup-card-subheading {
    font-size: clamp(1.05em, 2vw, 1.55em);
}

/* Subscribe form */

.kg-signup-card-form {
    position: relative;
    display: flex;
    flex-shrink: 0;
    width: 100%;
}

.kg-align-center .kg-signup-card-form {
    justify-content: center;
}

.kg-signup-card-heading + .kg-signup-card-form,
.kg-signup-card-subheading + .kg-signup-card-form {
    margin: min(2.4vmax, 48px) 0 0;
}

.kg-width-wide .kg-signup-card-heading + .kg-signup-card-form,
.kg-width-wide .kg-signup-card-subheading + .kg-signup-card-form {
    margin: min(3.2vmax, 64px) 0 0;
}

.kg-width-full .kg-signup-card-heading + .kg-signup-card-form,
.kg-width-full .kg-signup-card-subheading + .kg-signup-card-form {
    margin: min(4vmax, 80px) 0 0;
}

.kg-signup-card-fields {
    display: flex;
    width: 100%;
    padding: 3px;
    background: #FFFFFF;
    border: 1px solid #E6E6E6;
    border-radius: 4px;
}

.kg-width-wide .kg-signup-card-fields,
.kg-width-full .kg-signup-card-fields {
    width: 100%;
    max-width: 500px;
}

.kg-signup-card-input {
    width: 100%;
    height: 2.9em;
    min-height: 46px;
    margin: 0 3px 0 0;
    padding: 12px 16px;
    border: none;
    background: #FFFFFF;
    font-size: 1.1em;
}

.kg-signup-card-input:focus,
.kg-signup-card-input:focus-visible {
    outline: none;
}

.kg-signup-card-button {
    display: flex;
    position: relative;
    align-items: center;
    height: 2.9em;
    min-height: 46px;
    padding: 0 1.2em;
    outline: none;
    border: none;
    font-size: 1em;
    font-weight: 600;
    line-height: 1em;
    text-align: center;
    text-decoration: none;
    letter-spacing: .2px;
    white-space: nowrap;
    text-overflow: ellipsis;
    border-radius: 3px;
    transition: opacity .2s ease;
    cursor: pointer;
}

.kg-signup-card-button.kg-style-accent {
    background-color: var(--ghost-accent-color);
}

.kg-signup-card h2 + .kg-signup-card-button,
.kg-signup-card p + .kg-signup-card-button {
    margin: 1.5em 0 0;
}

.kg-signup-card .kg-signup-card-button:hover {
    opacity: 0.85;
}

.kg-signup-card.kg-width-wide .kg-signup-card-button {
    font-size: 1.05em;
}

.kg-signup-card.kg-width-wide h2 + .kg-signup-card-button,
.kg-signup-card.kg-width-wide p + .kg-signup-card-button {
    margin-top: 1.75em;
}

.kg-signup-card.kg-width-full .kg-signup-card-button {
    font-size: 1.1em;
}

.kg-signup-card.kg-width-full h2 + .kg-signup-card-button,
.kg-signup-card.kg-width-full p + .kg-signup-card-button {
    margin-top: 2em;
}

/* Subscribe form states */

.kg-signup-card-success,
.kg-signup-card-error {
    display: none;
}

.kg-signup-card-form.success .kg-signup-card-fields {
    display: none;
}

.kg-signup-card-form.success .kg-signup-card-success {
    display: flex;
    align-items: center;
    height: 3em;
    font-size: 1.25em;
    font-weight: 500;
    line-height: 1.4em;
}

.kg-signup-card-form.error .kg-signup-card-fields {
    border: 1px solid #FF0000;
    box-shadow: inset 0 0 0 1px rgba(255, 0, 0, 0.2);
}

.kg-signup-card-form.error .kg-signup-card-error {
    position: absolute;
    bottom: calc(-1rem - 1.6em);
    display: block;
    font-size: inherit;
}

.kg-signup-card-button-loading {
    position: absolute;
    inset: 0;
    align-items: center;
    justify-content: center;
    display: none;
}

.kg-signup-card-form.loading .kg-signup-card-button-default {
    color: transparent;
}

.kg-signup-card-form.loading .kg-signup-card-button-loading {
    display: flex;
}

/* Disclaimer */

.kg-signup-card-disclaimer {
    margin: 1rem 0 0;
}

.kg-signup-card-form.success + .kg-signup-card-disclaimer,
.kg-signup-card-form.error + .kg-signup-card-disclaimer {
    visibility: hidden;
}


/* Responsive styles */

@media (max-width: 640px) {
    .kg-layout-split .kg-signup-card-content {
        grid-template-columns: 1fr;
    }

    .kg-width-wide .kg-signup-card-text {
        padding: min(6.4vmax, 120px) min(4vmax, 80px);
    }

    .kg-layout-split.kg-content-wide .kg-signup-card-text,
    .kg-layout-split.kg-content-wide.kg-swapped .kg-signup-card-text {
        padding: min(9.6vmax, 180px) 0;
    }

    .kg-signup-card.kg-width-full .kg-signup-card-subheading:not(.kg-layout-split .kg-signup-card-subheading) {
        max-width: unset;
    }

    .kg-signup-card-content .kg-signup-card-image:not(.kg-content-wide .kg-signup-card-content .kg-signup-card-image) {
        height: auto;
        min-height: unset;
        aspect-ratio: 1 / 1;
    }

    .kg-content-wide .kg-signup-card-content .kg-signup-card-image {
        padding: 1.7em 0 0;
    }

    .kg-content-wide.kg-swapped .kg-signup-card-content .kg-signup-card-image {
        padding: 0 0 1.7em;
    }

    .kg-signup-card-input {
        height: 2.9em;
        padding: 6px 12px;
        font-size: 1em;
    }

    .kg-signup-card-button {
        height: 2.9em;
    }

    .kg-signup-card.kg-width-wide .kg-signup-card-button,
    .kg-signup-card.kg-width-full .kg-signup-card-button {
        font-size: 1em;
    }
}

.kg-toggle-card,
.kg-toggle-card * {
    box-sizing: border-box;
}

.kg-toggle-card {
    background: transparent;
    box-shadow: inset 0 0 0 1px rgba(124, 139, 154, 0.25);
    border-radius: 4px;
    padding: 1.2em;
}



.kg-toggle-content {
    height: auto;
    opacity: 1;
    transition: opacity 1s ease, top .35s ease;
    top: 0;
    position: relative;
}

.kg-toggle-card[data-kg-toggle-state="close"] svg {
    transform: unset;
}

.kg-toggle-heading {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.kg-toggle-card h4.kg-toggle-heading-text {
    font-size: 1.15em;
    font-weight: 700;
    line-height: 1.3em;
    margin-top: 0;
    margin-bottom: 0;
}

.kg-toggle-content p:first-of-type {
    margin-top: 0.5em;
}

.kg-toggle-card .kg-toggle-content p,
.kg-toggle-card .kg-toggle-content ol,
.kg-toggle-card .kg-toggle-content ul {
    font-size: 0.95em;
    line-height: 1.5em;
    margin-top: 0.95em;
    margin-bottom: 0;
}

.kg-toggle-card li + li {
    margin-top: 0.5em;
}

.kg-toggle-card-icon {
    height: 24px;
    width: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-left: 1em;
    padding: 0;
    background: none;
    border: 0;
    cursor: pointer;
}

.kg-toggle-heading svg {
    width: 14px;
    color: rgba(124, 139, 154, 0.5);
    transition: all 0.3s;
    transform: rotate(-180deg);
}

.kg-toggle-heading path {
    fill: none;
    stroke: currentcolor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.5;
    fill-rule: evenodd;
}

.kg-toggle-card + .kg-toggle-card {
    margin-top: 1em;
}

.kg-video-card,
.kg-video-card * {
    box-sizing: border-box;
}

.kg-video-card {
    position: relative;
    --seek-before-width: 0%;
    --volume-before-width: 100%;
    --buffered-width: 0%;
}

.kg-video-card video {
    display: block;
    max-width: 100%;
    height: auto;
}

.kg-video-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.kg-video-overlay {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-image: linear-gradient(180deg,rgba(0,0,0,0.3) 0,transparent 70%,transparent 100%);
    z-index: 999;
    transition: opacity .2s ease-in-out;
}

.kg-video-large-play-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 72px;
    height: 72px;
    padding: 0;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    transition: opacity .2s ease-in-out;
}

.kg-video-large-play-icon svg {
    width: 20px;
    height: auto;
    margin-left: 2px;
    fill: #fff;
}

.kg-video-player-container {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 80px;
    background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,.5));
    z-index: 999;
    transition: opacity .2s ease-in-out;

}

.kg-video-player {
    position: absolute;
    bottom: 0;
    display: flex;
    align-items: center;
    width: 100%;
    z-index: 9999;
    padding: 12px 16px;
}

.kg-video-current-time {
    min-width: 38px;
    padding: 0 4px;
    color: #fff;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.4em;
    white-space: nowrap;
}

.kg-video-time {
    color: rgba(255, 255, 255, 0.6);
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.4em;
    white-space: nowrap;
}

.kg-video-duration {
    padding: 0 4px;
}

.kg-video-play-icon,
.kg-video-pause-icon {
    position: relative;
    padding: 0px 4px 0 0;
    font-size: 0;
    background: transparent;
}

.kg-video-hide {
    display: none !important;
}

.kg-video-hide-animated {
    opacity: 0 !important;
    transition: opacity .2s ease-in-out;
    cursor: initial;
}

.kg-video-play-icon svg,
.kg-video-pause-icon svg {
    width: 14px;
    height: 14px;
    fill: #fff;
}

.kg-video-seek-slider {
    flex-grow: 1;
    margin: 0 4px;
}

@media (max-width: 520px) {
    .kg-video-seek-slider {
        display: none;
    }
}

.kg-video-playback-rate {
    min-width: 37px;
    padding: 0 4px;
    color: #fff;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.4em;
    text-align: left;
    background: transparent;
    white-space: nowrap;
}

@media (max-width: 520px) {
    .kg-video-playback-rate {
        padding-left: 8px;
    }
}

.kg-video-mute-icon,
.kg-video-unmute-icon {
    position: relative;
    bottom: -1px;
    padding: 0 4px;
    font-size: 0;
    background: transparent;
}

@media (max-width: 520px) {
    .kg-video-mute-icon,
    .kg-video-unmute-icon  {
        margin-left: auto;
    }
}

.kg-video-mute-icon svg,
.kg-video-unmute-icon svg {
    width: 16px;
    height: 16px;
    fill: #fff;
}

.kg-video-volume-slider {
    width: 80px;
}

@media (max-width: 300px) {
    .kg-video-volume-slider {
        display: none;
    }
}

.kg-video-seek-slider::before {
    content: "";
    position: absolute;
    left: 0;
    width: var(--seek-before-width) !important;
    height: 4px;
    cursor: pointer;
    background-color: #EBEEF0;
    border-radius: 2px;
}

.kg-video-volume-slider::before {
    content: "";
    position: absolute;
    left: 0;
    width: var(--volume-before-width) !important;
    height: 4px;
    cursor: pointer;
    background-color: #EBEEF0;
    border-radius: 2px;
}

/* Resetting browser styles
/* --------------------------------------------------------------- */

.kg-video-card input[type=range] {
    position: relative;
    -webkit-appearance: none;
    background: transparent;
}

.kg-video-card input[type=range]:focus {
    outline: none;
}

.kg-video-card input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
}

.kg-video-card input[type=range]::-ms-track {
    cursor: pointer;
    border-color: transparent;
    color: transparent;
    background: transparent;
}

.kg-video-card button {
    display: flex;
    align-items: center;
    border: 0;
    cursor: pointer;
}

.kg-video-card input[type="range"] {
    height: auto;
    padding: 0;
    border: 0;
}

/* Chrome & Safari styles
/* --------------------------------------------------------------- */

.kg-video-card input[type="range"]::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
}

.kg-video-card input[type="range"]::-webkit-slider-thumb {
    position: relative;
    box-sizing: content-box;
    width: 13px;
    height: 13px;
    margin: -5px 0 0 0;
    border: 0;
    cursor: pointer;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,0.24);
}

.kg-video-card input[type="range"]:active::-webkit-slider-thumb {
    transform: scale(1.2);
}

/* Firefox styles
/* --------------------------------------------------------------- */

.kg-video-card input[type="range"]::-moz-range-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
}

.kg-video-card input[type="range"]::-moz-range-progress {
    background: #EBEEF0;
    border-radius: 2px;
}

.kg-video-card input[type="range"]::-moz-range-thumb {
    box-sizing: content-box;
    width: 13px;
    height: 13px;
    border: 0;
    cursor: pointer;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,0.24);
}

.kg-video-card input[type="range"]:active::-moz-range-thumb {
    transform: scale(1.2);
}

/* Edge & IE styles
/* --------------------------------------------------------------- */

.kg-video-card input[type="range"]::-ms-track {
    width: 100%;
    height: 3px;
    border: solid transparent;
    color: transparent;
    cursor: pointer;
    background: transparent;
}

.kg-video-card input[type="range"]::-ms-fill-lower {
    background: #fff;
}

.kg-video-card input[type="range"]::-ms-fill-upper {
    background: #EBEEF0;
}

.kg-video-card input[type="range"]::-ms-thumb {
    box-sizing: content-box;
    width: 13px;
    height: 13px;
    border: 0;
    cursor: pointer;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,0.24);
}

.kg-video-card input[type="range"]:active::-ms-thumb {
    transform: scale(1.2);
}
.kg-header-card.kg-v2 {
    position: relative;
    padding: 0;
    min-height: initial;
    text-align: initial;
}

.kg-header-card.kg-v2,
.kg-header-card.kg-v2 * {
    box-sizing: border-box;
}

.kg-header-card.kg-v2 a,
.kg-header-card.kg-v2 a span {
    color: currentColor;
}

.kg-header-card.kg-style-accent.kg-v2 {
    background-color: var(--ghost-accent-color);
}

.kg-header-card-content {
    width: 100%;
}

.kg-layout-split .kg-header-card-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
}

.kg-header-card-text {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    height: 100%;
    padding: min(6.4vmax, 120px) min(4vmax, 80px);
    background-size: cover;
    background-position: center;
    text-align: left;
}

.kg-width-wide .kg-header-card-text {
    padding: min(10vmax, 220px) min(6.4vmax, 140px);
}

.kg-width-full .kg-header-card-text {
    padding: min(12vmax, 260px) 0;
}

.kg-layout-split .kg-header-card-text {
    padding: min(12vmax, 260px) min(4vmax, 80px);
}

.kg-layout-split.kg-content-wide .kg-header-card-text {
    padding: min(10vmax, 220px) 0 min(10vmax, 220px) min(4vmax, 80px);
}

.kg-layout-split.kg-content-wide.kg-swapped .kg-header-card-text {
    padding: min(10vmax, 220px) min(4vmax, 80px) min(10vmax, 220px) 0;
}

.kg-swapped .kg-header-card-text {
    grid-row: 1;
}

.kg-header-card-text.kg-align-center {
    align-items: center;
    text-align: center;
}

.kg-header-card.kg-style-image h2.kg-header-card-heading,
.kg-header-card.kg-style-image .kg-header-card-subheading,
.kg-header-card.kg-style-image.kg-v2 .kg-header-card-button {
    z-index: 999;
}

/* Background image */

.kg-header-card > picture > .kg-header-card-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    background-color: #FFFFFF;
    pointer-events: none;
}

/* Split layout image */

.kg-header-card-content .kg-header-card-image {
    width: 100%;
    /* this will force the image to follow the signup card height */
    height: 0;
    min-height: 100%;
    /**/
    object-fit: cover;
    object-position: center;
}

.kg-content-wide .kg-header-card-content .kg-header-card-image {
    height: 100%;
    padding: 5.6em 0;
    object-fit: contain;
}

/* Heading */

.kg-header-card h2.kg-header-card-heading {
    margin: 0;
    font-size: clamp(1.7em, 4vw, 2.5em);
    font-weight: 700;
    line-height: 1.05em;
    letter-spacing: -0.01em;
}

.kg-header-card.kg-width-wide h2.kg-header-card-heading {
    font-size: clamp(1.7em, 5vw, 3.3em);
}

.kg-header-card.kg-width-full h2.kg-header-card-heading {
    font-size: clamp(1.9em, 5.6vw, 4.2em);
}

.kg-header-card.kg-width-full.kg-layout-split h2.kg-header-card-heading {
    font-size: clamp(1.9em, 4vw, 3.3em);
}

/* Subheading */

.kg-header-card-subheading {
    margin: 0 0 2em;
}

.kg-header-card .kg-header-card-subheading {
    max-width: 40em;
    margin: 0;
    font-size: clamp(1.05em, 2vw, 1.4em);
    font-weight: 500;
    line-height: 1.2em;
}

.kg-header-card h2 + .kg-header-card-subheading {
    margin: 0.6em 0 0;
}

.kg-header-card .kg-header-card-subheading strong {
    font-weight: 600;
}

.kg-header-card.kg-width-wide .kg-header-card-subheading {
    font-size: clamp(1.05em, 2vw, 1.55em);
}

.kg-header-card.kg-width-full .kg-header-card-subheading:not(.kg-layout-split .kg-header-card-subheading) {
    max-width: min(65vmax, 1200px);
    font-size: clamp(1.05em, 2vw, 1.7em);
}

.kg-header-card.kg-width-full.kg-layout-split .kg-header-card-subheading {
    font-size: clamp(1.05em, 2vw, 1.55em);
}

.kg-header-card.kg-v2 .kg-header-card-button {
    display: flex;
    position: relative;
    align-items: center;
    height: 2.9em;
    min-height: 46px;
    padding: 0 1.2em;
    outline: none;
    border: none;
    font-size: 1em;
    font-weight: 600;
    line-height: 1em;
    text-align: center;
    text-decoration: none;
    letter-spacing: .2px;
    white-space: nowrap;
    text-overflow: ellipsis;
    border-radius: 3px;
    transition: opacity .2s ease;
}

.kg-header-card.kg-v2 .kg-header-card-button.kg-style-accent {
    background-color: var(--ghost-accent-color);
}

.kg-header-card.kg-v2 h2 + .kg-header-card-button,
.kg-header-card.kg-v2 p + .kg-header-card-button {
    margin: 1.5em 0 0;
}

.kg-header-card.kg-v2 .kg-header-card-button:hover {
    opacity: 0.85;
}

.kg-header-card.kg-v2.kg-width-wide .kg-header-card-button {
    font-size: 1.05em;
}

.kg-header-card.kg-v2.kg-width-wide h2 + .kg-header-card-button,
.kg-header-card.kg-v2.kg-width-wide p + .kg-header-card-button {
    margin-top: 1.75em;
}

.kg-header-card.kg-v2.kg-width-full .kg-header-card-button {
    font-size: 1.1em;
}

.kg-header-card.kg-v2.kg-width-full h2 + .kg-header-card-button,
.kg-header-card.kg-v2.kg-width-full p + .kg-header-card-button {
    margin-top: 2em;
}

/* Responsive styles */

@media (max-width: 640px) {
    .kg-layout-split .kg-header-card-content {
        grid-template-columns: 1fr;
    }

    .kg-width-wide .kg-header-card-text {
        padding: min(6.4vmax, 120px) min(4vmax, 80px);
    }

    .kg-layout-split.kg-content-wide .kg-header-card-text,
    .kg-layout-split.kg-content-wide.kg-swapped .kg-header-card-text {
        padding: min(9.6vmax, 180px) 0;
    }

    .kg-header-card.kg-width-full .kg-header-card-subheading:not(.kg-layout-split .kg-header-card-subheading) {
        max-width: unset;
    }

    .kg-header-card-content .kg-header-card-image:not(.kg-content-wide .kg-header-card-content .kg-header-card-image) {
        height: auto;
        min-height: unset;
        aspect-ratio: 1 / 1;
    }

    .kg-content-wide .kg-header-card-content .kg-header-card-image {
        padding: 1.7em 0 0;
    }

    .kg-content-wide.kg-swapped .kg-header-card-content .kg-header-card-image {
        padding: 0 0 1.7em;
    }

    .kg-header-card.kg-v2 .kg-header-card-button {
        height: 2.9em;
    }

    .kg-header-card.kg-v2.kg-width-wide .kg-header-card-button,
    .kg-header-card.kg-v2.kg-width-full .kg-header-card-button {
        font-size: 1em;
    }
}

  </style><link rel="stylesheet" type="text/css" href="${siteUrl}/assets/styles/reader.css" />`;
};

export default articleBodyStyles;

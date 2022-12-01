export const GlobalStyles = `
    /* Colors
    /* ----------------------------------------------------- */
    :root {
        --black: #000;
        --grey0: #1d1d1d;
        --grey1: #333;
        --grey2: #3d3d3d;
        --grey3: #474747;
        --grey4: #515151;
        --grey5: #686868;
        --grey6: #7f7f7f;
        --grey7: #979797;
        --grey8: #aeaeae;
        --grey9: #c5c5c5;
        --grey10: #dcdcdc;
        --grey11: #e1e1e1;
        --grey12: #eaeaea;
        --grey13: #f9f9f9;
        --grey14: #fbfbfb;
        --white: #fff;
        --red: #f02525;
        --darkerRed: #C50202;
        --yellow: #FFDC15;
        --green: #7FC724;
    }

    /* Globals
    /* ----------------------------------------------------- */
    html {
        font-size: 62.5%;
        height: 100%;
    }

    body {
        margin: 0px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        font-size: 1.6rem;
        height: 100%;
        line-height: 1.6em;
        font-weight: 400;
        font-style: normal;
        color: var(--grey2);
        box-sizing: border-box;
        overflow: hidden;
    }

    button,
    button span {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    }

    *, ::after, ::before {
        box-sizing: border-box;
    }

    h1, h2, h3, h4, h5, h6, p {
        line-height: 1.15em;
        padding: 0;
        margin: 0;
    }

    h1 {
        font-size: 35px;
        font-weight: 700;
        letter-spacing: -0.022em;
    }

    h2 {
        font-size: 32px;
        font-weight: 700;
        letter-spacing: -0.021em;
    }

    h3 {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.019em;
    }

    h4 {
        font-size: 19px;
        font-weight: 700;
        letter-spacing: -0.02em;
    }

    h5 {
        font-size: 15px;
        font-weight: 700;
        letter-spacing: -0.02em;
    }

    p {
        font-size: 15px;
        line-height: 1.5em;
        margin-bottom: 24px;
    }

    strong {
        font-weight: 600;
    }

    a,
    .gh-portal-link {
        cursor: pointer;
    }

    svg {
        box-sizing: content-box;
    }

    input,
    textarea {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        font-size: 1.5rem;
    }

    textarea {
        padding: 10px;
        line-height: 1.5em;
    }

    .gh-longform {
        padding: 6vmin 10vmin 4vmin 6vmin;
    }

    .gh-longform h3 {
        margin-top: 0;
        margin-bottom: 1em;
    }

    .gh-longform h4 {
        margin-top: 2.5em;
        margin-bottom: 1.25em;
    }

    .gh-longform h5 {
        margin-top: 0;
        margin-bottom: 0.5em;
    }

    .gh-longform .gh-portal-btn {
        width: calc(100% + 4vmin);
        margin-top: 4rem;
        margin-right: -4vmin;
    }

    @media (max-width: 1440px) {
        h1 {
            font-size: 32px;
            letter-spacing: -0.022em;
        }

        h2 {
            font-size: 28px;
            letter-spacing: -0.021em;
        }

        h3 {
            font-size: 26px;
            letter-spacing: -0.02em;
        }
    }

    @media (max-width: 480px) {
        h1 {
            font-size: 30px;
            letter-spacing: -0.021em;
        }

        h2 {
            font-size: 26px;
            letter-spacing: -0.02em;
        }

        h3 {
            font-size: 24px;
            letter-spacing: -0.019em;
        }

        .gh-longform {
            padding: 10vmin 12vmin 10vmin 10vmin;
        }

        .gh-mobile-shortener {
            display: none;
        }
    }
`;

export default GlobalStyles;
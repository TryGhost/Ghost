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
        --white: #fff;
        --red: #f02525;
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
        color: var(--grey4);
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
        font-size: 31px;
        font-weight: 500;
        letter-spacing: 0.2px;
    }

    h2 {
        font-size: 23px;
        font-weight: 500;
        letter-spacing: 0.2px;
    }

    h3 {
        font-size: 20px;
        font-weight: 500;
        letter-spacing: 0.2px;
    }

    p {
        font-size: 15px;
        line-height: 1.55em;
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
`;

export default GlobalStyles;
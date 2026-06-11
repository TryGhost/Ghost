// jsdom cannot run in workerd and is never reached there: the lexical
// renderer always receives an injected linkedom document (see
// src/frontend/rendering/lexical.ts). This stub satisfies the bundler for
// the renderer's lazy `import('jsdom')` fallback path.
export class JSDOM {
    constructor() {
        throw new Error('jsdom is not available in the Workers runtime');
    }
}

export default {JSDOM};

/* eslint-env node */
import pkg from './package.json';

export default [
    // Node build.
    // No transpilation or bundling other than converstion from es modules to cjs
    {
        input: pkg.source,
        output: {
            file: pkg.main,
            format: 'cjs',
            interop: false
        }
    }
];

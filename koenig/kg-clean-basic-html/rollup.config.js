/* eslint-env node */
import pkg from './package.json';
import babel from 'rollup-plugin-babel';

export default [
    // Node build.
    // No transpilation or bundling other than conversion from es modules to cjs
    {
        input: pkg.source,
        output: {
            file: pkg.main,
            format: 'cjs',
            interop: false
        }
    },

    // ES module build
    // Transpiles to target browser support for use in client apps
    {
        input: pkg.source,
        output: {
            file: pkg.module,
            format: 'es',
            sourcemap: true
        },
        plugins: [
            babel({
                presets: [
                    ['@babel/preset-env', {
                        modules: false,
                        targets: [
                            'last 2 Chrome versions',
                            'last 2 Firefox versions',
                            'last 2 Safari versions'
                        ].join(', ')
                    }]
                ],
                exclude: ['node_modules/**', '../../node_modules/**']
            })
        ]
    }
];

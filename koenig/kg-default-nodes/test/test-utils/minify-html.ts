import {makeModuleSynchronized} from 'make-synchronized';

// Keep renderer assertions synchronous, using the same worker bridge as @prettier/sync.
export const {minify} = makeModuleSynchronized<typeof import('html-minifier-next')>(
    import.meta.resolve('html-minifier-next')
);

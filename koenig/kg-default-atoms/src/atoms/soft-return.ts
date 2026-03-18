export interface AtomEnv {
    dom: {
        createElement(tag: string): unknown;
    };
}

export interface AtomOpts {
    env: AtomEnv;
}

export default {
    name: 'soft-return',
    type: 'dom',
    render(opts: AtomOpts) {
        return opts.env.dom.createElement('br');
    }
};

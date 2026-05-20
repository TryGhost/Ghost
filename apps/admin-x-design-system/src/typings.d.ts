declare module '*.svg' {
    const src: string;
    export default src;
}

declare module '*.svg?react' {
    import type {FunctionComponent, SVGProps} from 'react';
    const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
    export default ReactComponent;
}

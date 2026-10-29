declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.svg?react' {
  import type { FunctionComponent, SVGProps } from 'react';
  const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

// Portal runs React 17 and has no type package for react-dom. The one call TypeScript code makes
// into it is typed here.
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';
  export function createPortal(children: ReactNode, container: Element): ReactPortal;
}

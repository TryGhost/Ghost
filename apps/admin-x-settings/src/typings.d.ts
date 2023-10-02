declare module '@tryghost/timezone-data'
declare module '@tryghost/limit-service'
declare module '@tryghost/color-utils'
declare module '@tryghost/nql'

declare module '*.svg' {
    import React = require('react');
    export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    const src: string;
    export default src;
  }

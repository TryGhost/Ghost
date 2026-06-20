import {JSDOM} from 'jsdom';
import {buildCallRenderer} from './build-call-renderer';

export {assertPrettifiedIncludes} from './assert-prettified-includes';
export {assertPrettifiesTo} from './assert-prettifies-to';
export {html} from './html';
export {prettifyHTML} from './prettify-html';
export * as visibility from './visibility';

const dom = new JSDOM();
export const callRenderer = buildCallRenderer(dom);
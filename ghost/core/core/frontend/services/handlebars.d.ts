import {SafeString, HbsInstance} from 'express-hbs';

export {SafeString};
export const hbs: HbsInstance;
export const escapeExpression: (str: string) => string;
// TODO: Add proper types for these modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const templates: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const themeI18n: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const localUtils: any;

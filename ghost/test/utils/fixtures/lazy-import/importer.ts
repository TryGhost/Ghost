// Reached by require() from the test, so it is compiled by tsx's CommonJS
// hook, which leaves import() as a real ESM import.
export const load = () => import('./target');

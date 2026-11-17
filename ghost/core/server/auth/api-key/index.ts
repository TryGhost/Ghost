// Lazy, as before: each strategy loads only when first used
export default {
  get admin(): typeof import('./admin') {
    return require('./admin');
  },
  get content(): typeof import('./content') {
    return require('./content');
  },
};

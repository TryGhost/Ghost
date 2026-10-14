import noNativeError from './rules/no-native-error.mjs';

// Keep the ESLint rule name so existing inline exceptions apply to both linters.
export default {
  rules: {
    'ghost-custom/no-native-error': noNativeError,
  },
};

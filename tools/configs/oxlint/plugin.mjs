import ghost from 'eslint-plugin-ghost';

// Keep the ESLint rule name so existing inline exceptions apply to both linters.
export default {
  rules: {
    'ghost-custom/no-native-error': ghost.rules['ghost-custom/no-native-error'],
  },
};

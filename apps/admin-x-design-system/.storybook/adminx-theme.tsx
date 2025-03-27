import {create} from '@storybook/theming/create';

export default create({
    base: 'light',
      // Typography
    fontBase: '"Inter", sans-serif',
    fontCode: 'monospace',

    brandTitle: 'AdminX Design System',
    brandUrl: 'https://ghost.org',
    brandImage: 'https://github.com/peterzimon/playground/assets/353959/c4358b4e-232f-4dba-8abb-adb3142ccd89',
    brandTarget: '_self',

    //
    colorPrimary: '#30CF43',
    colorSecondary: '#15171A',

    // UI
    appBg: '#ffffff',
    appContentBg: '#ffffff',
    appBorderColor: '#EBEEF0',
    appBorderRadius: 0,

    // Text colors
    textColor: '#15171A',
    textInverseColor: '#ffffff',

    // Toolbar default and active colors
    barTextColor: '#9E9E9E',
    barSelectedColor: '#15171A',
    barBg: '#ffffff',

    // Form colors
    inputBg: '#ffffff',
    inputBorder: '#15171A',
    inputTextColor: '#15171A',
    inputBorderRadius: 2,
});
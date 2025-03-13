const adminXPreset = require('@tryghost/shade/tailwind.cjs');

module.exports = {
    presets: [adminXPreset('.shade')],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/admin-x-design-system/es/**/*.{js,ts,jsx,tsx}', '../../node_modules/@tryghost/shade/es/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            keyframes: {
                lineExpand: {
                    '0%': {
                        transform: 'scaleX(0)',
                        transformOrigin: 'right'
                    },
                    '100%': {
                        transform: 'scaleX(1)',
                        transformOrigin: 'right'
                    }
                },
                scale: {
                    '0%': {
                        transform: 'scale(0.8)'
                    },
                    '70%': {
                        transform: 'scale(1.1)'
                    },
                    '100%': {
                        transform: 'scale(1)'
                    }
                }
            },
            animation: {
                'onboarding-handle-bg': 'fadeIn 0.2s ease-in 0.5s forwards',
                'onboarding-handle-line': 'lineExpand 0.2s ease-in-out 0.7s forwards',
                'onboarding-handle-label': 'fadeIn 0.2s ease-in 1.2s forwards',
                'onboarding-next-button': 'fadeIn 0.2s ease-in 2s forwards',
                'onboarding-followers': 'fadeIn 0.2s ease-in 0.5s forwards, scale 0.3s ease-in 0.5s forwards'
            }
        }
    }
};

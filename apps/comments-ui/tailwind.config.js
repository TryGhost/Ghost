module.exports = {
    darkMode: 'class',
    theme: {
        screens: {
            sm: '481px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1400px'
        },
        spacing: {
            px: '1px',
            0: '0px',
            0.5: '0.2rem',
            1: '0.4rem',
            1.5: '0.6rem',
            2: '0.8rem',
            2.5: '1rem',
            3: '1.2rem',
            3.5: '1.4rem',
            4: '1.6rem',
            5: '2rem',
            6: '2.4rem',
            7: '2.8rem',
            8: '3.2rem',
            9: '3.6rem',
            10: '4rem',
            11: '4.4rem',
            12: '4.8rem',
            14: '5.6rem',
            16: '6.4rem',
            20: '8rem',
            24: '9.6rem',
            28: '11.2rem',
            32: '12.8rem',
            36: '14.4rem',
            40: '16rem',
            44: '17.6rem',
            48: '19.2rem',
            52: '20.8rem',
            56: '22.4rem',
            60: '24rem',
            64: '25.6rem',
            72: '28.8rem',
            80: '32rem',
            96: '38.4rem'
        },
        maxWidth: {
            none: 'none',
            0: '0rem',
            xs: '32rem',
            sm: '38.4rem',
            md: '44.8rem',
            lg: '51.2rem',
            xl: '57.6rem',
            '2xl': '67.2rem',
            '3xl': '76.8rem',
            '4xl': '89.6rem',
            '5xl': '102.4rem',
            '6xl': '115.2rem',
            '7xl': '128rem',
            '8xl': '140rem',
            '9xl': '156rem',
            full: '100%',
            min: 'min-content',
            max: 'max-content',
            fit: 'fit-content',
            prose: '65ch'
        },
        minWidth: {
            none: 'none',
            0: '0rem',
            xs: '32rem',
            sm: '38.4rem',
            md: '44.8rem',
            lg: '51.2rem',
            xl: '57.6rem',
            '2xl': '67.2rem',
            '3xl': '76.8rem',
            '4xl': '89.6rem',
            '5xl': '102.4rem',
            '6xl': '115.2rem',
            '7xl': '128rem',
            '8xl': '140rem',
            '9xl': '156rem',
            full: '100%',
            min: 'min-content',
            max: 'max-content',
            fit: 'fit-content',
            prose: '65ch'
        },
        borderRadius: {
            sm: '0.2rem',
            DEFAULT: '0.4rem',
            md: '0.6rem',
            lg: '0.8rem',
            xl: '1.2rem',
            '2xl': '1.6rem',
            '3xl': '2.4rem',
            full: '9999px'
        },
        fontSize: {
            xs: '1.2rem',
            sm: '1.4rem',
            md: '1.5rem',
            lg: '1.8rem',
            xl: '2rem',
            '2xl': '2.4rem',
            '3xl': '3rem',
            '4xl': '3.6rem',
            '5xl': ['4.8rem', '1.15'],
            '6xl': ['6rem', '1'],
            '7xl': ['7.2rem', '1'],
            '8xl': ['9.6rem', '1'],
            '9xl': ['12.8rem', '1']
        },
        letterSpacing: {
            tightest: '-.075em',
            tighter: '-.05em',
            tight: '-.018em',
            normal: '0',
            wide: '.018em',
            wider: '.05em',
            widest: '.1em'
        },
        boxShadow: {
            lg: [
                '0px 0px 1px rgba(0, 0, 0, 0.12)', 
                '0px 4px 8px rgba(0, 0, 0, 0.04)', 
                '0px 8px 48px rgba(0, 0, 0, 0.05)'
            ],
            xl: [
                '0px 0px 1px rgba(0, 0, 0, 0.12)', 
                '0px 13px 20px rgba(0, 0, 0, 0.04)', 
                '0px 14px 57px rgba(0, 0, 0, 0.06)'
            ],
            form: [
                '0px 78px 57px -57px rgba(0, 0, 0, 0.1)',
                '0px 15px 20px -8px rgba(0, 0, 0, 0.08)',
                '0px 0px 1px 0px rgba(0,0,0,0.32)'
            ],
            formxl: [
                '0px 78px 57px -57px rgba(0, 0, 0, 0.125)',
                '0px 15px 20px -8px rgba(0, 0, 0, 0.1)',
                '0px 0px 1px 0px rgba(0, 0, 0, 0.32)'
            ],
            modal: [
                '0 3.8px 2.2px rgba(0, 0, 0, 0.028)',
                '0 9.2px 5.3px rgba(0, 0, 0, 0.04)',
                '0 17.3px 10px rgba(0, 0, 0, 0.05)',
                '0 30.8px 17.9px rgba(0, 0, 0, 0.06)',
                '0 57.7px 33.4px rgba(0, 0, 0, 0.072)',
                '0 138px 80px rgba(0, 0, 0, 0.1)'
            ]
        },
        animation: {
            heartbeat: 'heartbeat 0.35s ease-in-out forwards'
        },
        keyframes: {
            heartbeat: {
                '0%, 100%': {transform: 'scale(1)'},
                '50%': {transform: 'scale(1.3)'}
            }
        }
    },
    content: [
        './src/**/*.{js,jsx,ts,tsx}'
    ],
    plugins: []
};

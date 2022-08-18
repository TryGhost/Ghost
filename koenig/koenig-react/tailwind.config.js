module.exports = {
    corePlugins: {
        preflight: false // we're providing our own scoped CSS reset
    },
    important: '.koenig-react',
    content: [
        './src/**/*.{js,jsx,ts,tsx}'
    ],
    theme: {
        colors: {
            transparent: 'transparent',
            current: 'currentColor',
            white: '#ffffff',
            black: '#15171A',
            grey: {
                DEFAULT: '#ABB4BE',
                50: '#F9F9FA',
                100: '#EBEEF0',
                200: '#DDE1E5',
                300: '#CED4D9',
                400: '#BDC5CC',
                500: '#ABB4BE',
                600: '#95A1AD',
                700: '#7C8B9A',
                800: '#626D79',
                900: '#394047'
            },
            green: {
                DEFAULT: '#30cf43',
                100: '#E1F9E4',
                400: '#58da67',
                500: '#30cf43',
                600: '#2ab23a'
            },
            blue: {
                DEFAULT: '#14b8ff',
                100: '#DBF4FF',
                400: '#42c6ff',
                500: '#14b8ff',
                600: '#00a4eb'
            },
            purple: {
                DEFAULT: '#8e42ff',
                100: '#ede0ff',
                400: '#a366ff',
                500: '#8e42ff',
                600: '7b1fff'
            },
            pink: {
                DEFAULT: '#fb2d8d',
                100: '#FFDFEE',
                400: '#ff5ca8',
                500: '#fb2d8d',
                600: '#f70878'
            },
            red: {
                DEFAULT: '#f50b23',
                100: '#FFE0E0',
                400: '#f9394c',
                500: '#f50b23',
                600: '#dc091e'
            },
            yellow: {
                DEFAULT: '#ffb41f',
                100: '#fff1d6',
                400: '#ffc247',
                500: '#ffb41f',
                600: '#f0a000'
            },
            lime: {
                DEFAULT: '#B5FF18'
            }
        },
        extend: {
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
            }
        }
    }
};

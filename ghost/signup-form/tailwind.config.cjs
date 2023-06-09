/** @type {import('tailwindcss').Config} */
module.exports = {
    corePlugins: {
        preflight: true
    },
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        screens: {
            xs: '439px',
            sm: '480px',
            md: '640px',
            lg: '1024px',
            xl: '1280px'
        },
        colors: {
            transparent: 'transparent',
            current: 'currentColor',
            white: '#FFF',
            black: '#15171A',
            grey: {
                DEFAULT: '#ABB4BE',
                50: '#FAFAFB',
                100: '#F4F5F6',
                200: '#EBEEF0',
                300: '#DDE1E5',
                400: '#CED4D9',
                500: '#AEB7C1',
                600: '#95A1AD',
                700: '#7C8B9A',
                800: '#626D79',
                900: '#394047'
            },
            green: {
                DEFAULT: '#30CF43',
                100: '#E1F9E4',
                400: '#58DA67',
                500: '#30CF43',
                600: '#2AB23A'
            },
            blue: {
                DEFAULT: '#14B8FF',
                100: '#DBF4FF',
                400: '#42C6FF',
                500: '#14B8FF',
                600: '#00A4EB'
            },
            purple: {
                DEFAULT: '#8E42FF',
                100: '#EDE0FF',
                400: '#A366FF',
                500: '#8E42FF',
                600: '7B1FFF'
            },
            pink: {
                DEFAULT: '#FB2D8D',
                100: '#FFDFEE',
                400: '#FF5CA8',
                500: '#FB2D8D',
                600: '#F70878'
            },
            red: {
                DEFAULT: '#F50B23',
                100: '#FFE0E0',
                400: '#F9394C',
                500: '#F50B23',
                600: '#DC091E'
            },
            yellow: {
                DEFAULT: '#FFB41F',
                100: '#FFF1D6',
                400: '#FFC247',
                500: '#FFB41F',
                600: '#F0A000'
            },
            lime: {
                DEFAULT: '#B5FF18'
            }
        },
        fontFamily: {
            inter: 'Inter',
            sans: 'Inter, -apple-system, BlinkMacSystemFont, avenir next, avenir, helvetica neue, helvetica, ubuntu, roboto, noto, segoe ui, arial, sans-serif',
            serif: 'Georgia, serif',
            mono: 'Consolas, Liberation Mono, Menlo, Courier, monospace'
        },
        boxShadow: {
            DEFAULT: '0 0 1px rgba(0,0,0,.05), 0 5px 18px rgba(0,0,0,.08)',
            sm: '0 0 1px rgba(0,0,0,.12), 0 1px 6px rgba(0,0,0,0.03), 0 6px 10px -8px rgba(0,0,0,.1)',
            md: '0 0 1px rgba(0,0,0,.05), 0 8px 28px rgba(0,0,0,.12)',
            lg: '0 0 7px rgba(0, 0, 0, 0.08), 0 2.1px 2.2px -5px rgba(0, 0, 0, 0.011), 0 5.1px 5.3px -5px rgba(0, 0, 0, 0.016), 0 9.5px 10px -5px rgba(0, 0, 0, 0.02), 0 17px 17.9px -5px rgba(0, 0, 0, 0.024), 0 31.8px 33.4px -5px rgba(0, 0, 0, 0.029), 0 76px 80px -5px rgba(0, 0, 0, 0.04)',
            xl: '0 2.8px 2.2px rgba(0, 0, 0, 0.02), 0 6.7px 5.3px rgba(0, 0, 0, 0.028), 0 12.5px 10px rgba(0, 0, 0, 0.035), 0 22.3px 17.9px rgba(0, 0, 0, 0.042), 0 41.8px 33.4px rgba(0, 0, 0, 0.05), 0 100px 80px rgba(0, 0, 0, 0.07)',
            inner: 'inset 0 0 4px 0 rgb(0 0 0 / 0.08)',
            none: '0 0 #0000'
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
                18: '7.2rem',
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
                sm: '0.3rem',
                DEFAULT: '0.4rem',
                md: '0.6rem',
                lg: '0.8rem',
                xl: '1.2rem',
                '2xl': '1.6rem',
                '3xl': '2.4rem',
                full: '9999px'
            },
            fontSize: {
                '2xs': '1.05rem',
                base: '1.5rem',
                xs: '1.2rem',
                sm: '1.35rem',
                md: '1.5rem',
                lg: '1.8rem',
                xl: '2rem',
                '2xl': '2.4rem',
                '3xl': '3rem',
                '4xl': '3.6rem',
                '5xl': ['4.2rem', '1.15'],
                '6xl': ['6rem', '1'],
                '7xl': ['7.2rem', '1'],
                '8xl': ['9.6rem', '1'],
                '9xl': ['12.8rem', '1']
            },
            lineHeight: {
                base: '1.5em',
                tight: '1.35em',
                tighter: '1.25em',
                supertight: '1.1em'
            },
            transition: {
                basic: 'all 0.4 ease'
            }
        }
    }
};

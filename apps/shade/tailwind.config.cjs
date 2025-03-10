// Used for eslint and storybook. Styles should not be compiled directly with this, they should be compiled by calling the function in tailwind.cjs
module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    important: '.shade',

    corePlugins: {
        preflight: false // we're providing our own scoped CSS reset
    },
    darkMode: 'selector',
    theme: {
        screens: {
            sm: '480px',
            md: '640px',
            lg: '1024px',
            xl: '1320px',
            xxl: '1440px',
            xxxl: '1600px',
            tablet: '860px'
        },
        colors: {
            transparent: 'transparent',
            current: 'currentColor',
            accent: 'var(--accent-color, #ff0095)',
            white: '#FFF',
            black: '#15171A',

            // `grey` is part of the config because of legacy reasons. The old design
            // system uses it but the official grey color name in Shade is "gray" — use that!
            grey: {
                50: '#FAFAFB',
                75: '#F9FAFB',
                100: '#F4F5F6',
                150: '#F1F3F4',
                200: '#EBEEF0',
                250: '#E5E9ED',
                300: '#DDE1E5',
                400: '#CED4D9',
                500: '#AEB7C1',
                600: '#95A1AD',
                700: '#7C8B9A',
                800: '#626D79',
                900: '#394047',
                925: '#2E3338',
                950: '#222427',
                975: '#191B1E',
                DEFAULT: '#ABB4BE'
            },

            gray: {
                50: '#FAFAFB',
                75: '#F9FAFB',
                100: '#F4F5F6',
                150: '#F1F3F4',
                200: '#EBEEF0',
                250: '#E5E9ED',
                300: '#DDE1E5',
                400: '#CED4D9',
                500: '#AEB7C1',
                600: '#95A1AD',
                700: '#7C8B9A',
                800: '#626D79',
                900: '#394047',
                925: '#2E3338',
                950: '#222427',
                975: '#191B1E',
                DEFAULT: '#ABB4BE'
            },
            green: {
                100: '#E1F9E4',
                400: '#58DA67',
                500: '#30CF43',
                600: '#2AB23A',
                DEFAULT: '#30CF43'
            },
            blue: {
                100: '#DBF4FF',
                400: '#42C6FF',
                500: '#14B8FF',
                600: '#00A4EB',
                DEFAULT: '#14B8FF'
            },
            purple: {
                100: '#EDE0FF',
                400: '#A366FF',
                500: '#8E42FF',
                600: '#7B1FFF',
                DEFAULT: '#8E42FF'
            },
            pink: {
                100: '#FFDFEE',
                400: '#FF5CA8',
                500: '#FB2D8D',
                600: '#F70878',
                DEFAULT: '#FB2D8D'
            },
            red: {
                100: '#FFE0E0',
                400: '#F9394C',
                500: '#F50B23',
                600: '#DC091E',
                DEFAULT: '#F50B23'
            },
            yellow: {
                100: '#FFF1D6',
                400: '#FFC247',
                500: '#FFB41F',
                600: '#F0A000',
                DEFAULT: '#FFB41F'
            },
            lime: {
                DEFAULT: '#B5FF18'
            }
        },
        fontFamily: {
            cardo: 'Cardo',
            manrope: 'Manrope',
            merriweather: 'Merriweather',
            nunito: 'Nunito',
            'tenor-sans': 'Tenor Sans',
            'old-standard-tt': 'Old Standard TT',
            prata: 'Prata',
            roboto: 'Roboto',
            rufina: 'Rufina',
            inter: 'Inter',
            sans: 'Inter, -apple-system, BlinkMacSystemFont, avenir next, avenir, helvetica neue, helvetica, ubuntu, roboto, noto, segoe ui, arial, sans-serif',
            serif: 'Georgia, serif',
            mono: 'Consolas, Liberation Mono, Menlo, Courier, monospace',
            inherit: 'inherit',
            'space-grotesk': 'Space Grotesk',
            'chakra-petch': 'Chakra Petch',
            'noto-sans': 'Noto Sans',
            poppins: 'Poppins',
            'fira-sans': 'Fira Sans',
            'noto-serif': 'Noto Serif',
            lora: 'Lora',
            'ibm-plex-serif': 'IBM Plex Serif',
            'space-mono': 'Space Mono',
            'fira-mono': 'Fira Mono',
            'jetbrains-mono': 'JetBrains Mono'
        },
        letterSpacing: {
            tightest: '-.05em',
            tighter: '-.025em',
            tight: '-.01em',
            normal: '0',
            wide: '.01em',
            wider: '.025em',
            widest: '.5em'
        },
        boxShadow: {
            DEFAULT: '0 0 1px rgba(0,0,0,.05), 0 5px 18px rgba(0,0,0,.08)',
            xs: '0 0 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), 0 8px 10px -12px rgba(0,0,0,.1)',
            sm: '0 0 1px rgba(0,0,0,.12), 0 1px 6px rgba(0,0,0,0.03), 0 8px 10px -8px rgba(0,0,0,.1)',
            md: '0 0 1px rgba(0,0,0,0.12), 0 1px 6px rgba(0,0,0,0.03), 0 8px 10px -8px rgba(0,0,0,0.05), 0px 24px 37px -21px rgba(0, 0, 0, 0.05)',
            'md-heavy': '0 0 1px rgba(0,0,0,0.22), 0 1px 6px rgba(0,0,0,0.15), 0 8px 10px -8px rgba(0,0,0,0.16), 0px 24px 37px -21px rgba(0, 0, 0, 0.46)',
            lg: '0 0 7px rgba(0, 0, 0, 0.08), 0 2.1px 2.2px -5px rgba(0, 0, 0, 0.011), 0 5.1px 5.3px -5px rgba(0, 0, 0, 0.016), 0 9.5px 10px -5px rgba(0, 0, 0, 0.02), 0 17px 17.9px -5px rgba(0, 0, 0, 0.024), 0 31.8px 33.4px -5px rgba(0, 0, 0, 0.029), 0 76px 80px -5px rgba(0, 0, 0, 0.04)',
            xl: '0 2.8px 2.2px rgba(0, 0, 0, 0.02), 0 6.7px 5.3px rgba(0, 0, 0, 0.028), 0 12.5px 10px rgba(0, 0, 0, 0.035), 0 22.3px 17.9px rgba(0, 0, 0, 0.042), 0 41.8px 33.4px rgba(0, 0, 0, 0.05), 0 100px 80px rgba(0, 0, 0, 0.07)',
            inner: 'inset 0 0 4px 0 rgb(0 0 0 / 0.08)',
            none: '0 0 #0000'
        },
        extend: {
            keyframes: {
                toasterIn: {
                    '0.00%': {
                        transform: 'translateY(100%)'
                    },
                    '26.52%': {
                        transform: 'translateY(-3.90px)'
                    },
                    '63.26%': {
                        transform: 'translateY(1.2px)'
                    },
                    '100.00%': {
                        transform: 'translateY(0px)'
                    }
                },
                toasterTopIn: {
                    '0.00%': {
                        transform: 'translateY(-82px)'
                    },
                    '26.52%': {
                        transform: 'translateY(5.90px)'
                    },
                    '63.26%': {
                        transform: 'translateY(-1.77px)'
                    },
                    '100.00%': {
                        transform: 'translateY(0px)'
                    }
                },
                toasterOut: {
                    '0%': {
                        opacity: '1'
                    },
                    '100%': {
                        opacity: '0'
                    }
                },
                fadeIn: {
                    '0%': {
                        opacity: '0'
                    },
                    '100%': {
                        opacity: '1'
                    }
                },
                fadeOut: {
                    '0%': {
                        opacity: '1'
                    },
                    '100%': {
                        opacity: '0'
                    }
                },
                modalIn: {
                    '0%': {
                        transform: 'translateY(32px)'
                    },
                    '100%': {
                        transform: 'translateY(0px)'
                    }
                },
                modalInFromRight: {
                    '0%': {
                        transform: 'translateX(32px)',
                        opacity: '0'
                    },
                    '100%': {
                        transform: 'translateX(0px)',
                        opacity: '1'
                    }
                },
                modalInReverse: {
                    '0%': {
                        transform: 'translateY(-32px)'
                    },
                    '100%': {
                        transform: 'translateY(0px)'
                    }
                },
                spin: {
                    '0%': {
                        transform: 'rotate(0deg)'
                    },
                    '100%': {
                        transform: 'rotate(360deg)'
                    }
                }
            },
            animation: {
                'toaster-in': 'toasterIn 0.8s cubic-bezier(0.445, 0.050, 0.550, 0.950)',
                'toaster-out': 'toasterOut 0.4s 0s 1 ease forwards',
                'toaster-top-in': 'toasterTopIn 0.8s cubic-bezier(0.445, 0.050, 0.550, 0.950)',
                'fade-in': 'fadeIn 0.15s ease forwards',
                'fade-out': 'fadeOut 0.15s ease forwards',
                'setting-highlight-fade-out': 'fadeOut 0.2s 1.4s ease forwards',
                'modal-backdrop-in': 'fadeIn 0.15s ease forwards',
                'modal-in': 'modalIn 0.25s ease forwards',
                'modal-in-from-right': 'modalInFromRight 0.25s ease forwards',
                'modal-in-reverse': 'modalInReverse 0.25s ease forwards',
                spin: 'spin 1s linear infinite'
            },
            spacing: {
                0: '0px',
                1: '0.4rem',
                2: '0.8rem',
                3: '1.2rem',
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
                22: '9.2rem',
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
                96: '38.4rem',
                px: '1px',
                0.5: '0.2rem',
                1.5: '0.6rem',
                2.5: '1rem',
                3.5: '1.4rem'
            },
            maxWidth: {
                0: '0rem',
                none: 'none',
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
                '7xl': '132rem',
                '8xl': '140rem',
                '9xl': '156rem',
                full: '100%',
                min: 'min-content',
                max: 'max-content',
                fit: 'fit-content',
                prose: '65ch',
                page: '148rem'
            },
            borderRadius: {
                sm: 'calc(var(--radius) - 4px)',
                DEFAULT: '0.4rem',
                md: 'calc(var(--radius) - 2px)',
                lg: 'var(--radius)',
                xl: '1.2rem',
                '2xl': '1.6rem',
                '3xl': '2.4rem',
                full: '9999px'
            },
            fontSize: {
                '2xs': '1.0rem',
                base: '1.4rem',
                xs: '1.2rem',
                sm: '1.3rem',
                md: '1.4rem',
                lg: '1.5rem',
                xl: '1.7rem',
                '2xl': '2.2rem',
                '3xl': '2.7rem',
                '4xl': '3.2rem',
                '5xl': [
                    '4.0rem',
                    '1.15'
                ],
                '6xl': [
                    '5.8rem',
                    '1'
                ],
                '7xl': [
                    '7.0rem',
                    '1'
                ],
                '8xl': [
                    '9.6rem',
                    '1'
                ],
                '9xl': [
                    '12.8rem',
                    '1'
                ],
                inherit: 'inherit'
            },
            lineHeight: {
                base: '1.5em',
                tight: '1.35em',
                tighter: '1.25em',
                supertight: '1.1em'
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    1: 'hsl(var(--chart-1))',
                    2: 'hsl(var(--chart-2))',
                    3: 'hsl(var(--chart-3))',
                    4: 'hsl(var(--chart-4))',
                    5: 'hsl(var(--chart-5))'
                },
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))'
                }
            }
        }
    },
    plugins: [require('tailwindcss-animate')]
};

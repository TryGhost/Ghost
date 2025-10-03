import Content from './content/Content';
import Loading from './content/Loading';
import React, {useCallback, useEffect, useState} from 'react';
import {ROOT_DIV_ID} from '../utils/constants';
import {useAppContext} from '../AppContext';

type Props = {
    done: boolean
};
const ContentBox: React.FC<Props> = ({done}) => {
    const luminance = (colorString: string) => {
        if (colorString.startsWith('oklab') || colorString.startsWith('oklch')) {
            const regexMatches = colorString.match(/ok(?:lab|lch)\(([^ ]+)/);
            if (!regexMatches || regexMatches.length < 2) {
                return 0;
            }
            const lum = regexMatches[1];
            if (lum === 'none') {
                return 0;
            } else {
                return parseFloat(lum);
            }
        } else if (colorString.startsWith('rgb')) {
            const colorsOnly = colorString.substring(colorString.indexOf('(') + 1, colorString.lastIndexOf(')')).split(/,\s*/);
            const r = parseInt(colorsOnly[0]);
            const g = parseInt(colorsOnly[1]);
            const b = parseInt(colorsOnly[2]);

            const a = [r, g, b].map(function (v) {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        } else {
            // Unknown color space, assume 0 luminance
            return 0;
        }
    };

    const contrast = (lum1: number, lum2: number) => {
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    };
    const {accentColor, colorScheme} = useAppContext();

    const darkMode = useCallback(() => {
        if (colorScheme === 'light') {
            return false;
        } else if (colorScheme === 'dark') {
            return true;
        } else {
            // Always fall back to container color detection
            const el = document.getElementById(ROOT_DIV_ID);
            if (!el || !el.parentElement) {
                return false;
            }
            const containerColor = getComputedStyle(el.parentElement).getPropertyValue('color');

            if (containerColor.startsWith('oklab') || containerColor.startsWith('oklch')) {
                // For oklab/oklch, use simple lightness threshold since L already represents perceptual lightness
                return luminance(containerColor) > 0.6;
            } else {
                // For RGB, use contrast calculation with sRGB relative luminance
                return contrast(1, luminance(containerColor)) < 5;
            }
        }
    }, [colorScheme, contrast]);

    const [containerClass, setContainerClass] = useState(darkMode() ? 'dark' : '');

    useEffect(() => {
        // Update class when colorScheme changes
        setContainerClass(darkMode() ? 'dark' : '');
    }, [colorScheme, darkMode]);

    useEffect(() => {
        // Handle container style/class changes
        const el = document.getElementById(ROOT_DIV_ID);
        if (el?.parentElement) {
            const observer = new MutationObserver(() => {
                setContainerClass(darkMode() ? 'dark' : '');
            });
            observer.observe(el.parentElement, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });
            return () => {
                observer.disconnect();
            };
        }
    }, [darkMode]);

    const style = {
        '--gh-accent-color': accentColor ?? 'black',
        paddingTop: 0,
        paddingBottom: 24 // remember to allow for bottom shadow on comment text box
    };

    return (
        <section className={'ghost-display ' + containerClass} data-loaded={done} data-testid="content-box" style={style}>
            {done ? <Content /> : <Loading />}
        </section>
    );
};

export default ContentBox;

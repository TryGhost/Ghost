import Content from './content/Content';
import Loading from './content/Loading';
import React, {useCallback, useEffect, useState} from 'react';
import {ROOT_DIV_ID} from '../utils/constants';
import {useAppContext} from '../AppContext';

type Props = {
    done: boolean
};
const ContentBox: React.FC<Props> = ({done}) => {
    const luminance = (r: number, g: number, b: number) => {
        const a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const contrast = (rgb1: [number, number, number], rgb2: [number, number, number]) => {
        const lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
        const lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
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

            const colorsOnly = containerColor.substring(containerColor.indexOf('(') + 1, containerColor.lastIndexOf(')')).split(/,\s*/);
            const red = parseInt(colorsOnly[0]);
            const green = parseInt(colorsOnly[1]);
            const blue = parseInt(colorsOnly[2]);

            return contrast([255, 255, 255], [red, green, blue]) < 5;
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

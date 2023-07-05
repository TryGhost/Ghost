import Content from './content/Content';
import Loading from './content/Loading';
import React from 'react';
import {ROOT_DIV_ID} from '../utils/constants';
import {useAppContext} from '../AppContext';

type Props = {
    done: boolean
};
const ContentBox: React.FC<Props> = ({done}) => {
    const luminance = (r: number, g: number, b: number) => {
        var a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const contrast = (rgb1: [number, number, number], rgb2: [number, number, number]) => {
        var lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
        var lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
        var brightest = Math.max(lum1, lum2);
        var darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    };
    const {accentColor, colorScheme} = useAppContext();

    const darkMode = () => {
        if (colorScheme === 'light') {
            return false;
        } else if (colorScheme === 'dark') {
            return true;
        } else {
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
    };

    const containerClass = darkMode() ? 'dark' : '';
    const style = {
        '--gh-accent-color': accentColor ?? 'blue',
        paddingTop: 0,
        paddingBottom: 24 // remember to allow for bottom shadow on comment text box
    };

    return (
        <section className={'ghost-display ' + containerClass} data-testid="content-box" style={style}>
            {done ? <Content /> : <Loading />}
        </section>
    );
};

export default ContentBox;

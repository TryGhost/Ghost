import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useMemo} from 'react';

function getNearestBackground(element: HTMLElement): string {
    var bg = getComputedStyle(element).getPropertyValue('background-color');

    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        return bg;
    }

    if (!element.parentElement) {
        return '#ffffff';
    }

    return getNearestBackground(element.parentElement);
}

export function useColors(backgroundColor: string, root: HTMLElement) {
    return useMemo(() => {
        let computedBackground = backgroundColor;

        if (backgroundColor === 'inherit') {
            computedBackground = getNearestBackground(root);
        }

        const textColor = textColorForBackgroundColor(computedBackground).hex();

        return {backgroundColor: computedBackground, textColor};
    }, [backgroundColor, root]);
}

import Color from 'color';

export function lightenToContrastThreshold(foreground, background, contrastThreshold) {
    const foregroundColor = Color(foreground);
    const backgroundColor = Color(background);

    let newColor = foregroundColor;

    while (newColor.contrast(backgroundColor) < contrastThreshold) {
        if (newColor.l() >= 100) {
            break;
        }

        newColor = newColor.lightness(newColor.l() + 5);
    }

    return newColor;
}

export function darkenToContrastThreshold(foreground, background, contrastThreshold) {
    const foregroundColor = Color(foreground);
    const backgroundColor = Color(background);

    let newColor = foregroundColor;

    while (newColor.contrast(backgroundColor) < contrastThreshold) {
        if (newColor.l() <= 0) {
            break;
        }

        newColor = newColor.lightness(newColor.l() - 5);
    }

    return newColor;
}

export function textColorForBackgroundColor(background) {
    const backgroundColor = Color(background);

    const white = Color({r: 255, g: 255, b: 255});
    const black = Color({r: 0, g: 0, b: 0});

    // shared with Portal https://github.com/TryGhost/Portal/blob/317876f20d22431df15e655ea6cc197fe636615e/src/utils/contrast-color.js#L26-L29
    const yiq = (
        backgroundColor.red() * 299 +
        backgroundColor.green() * 587 +
        backgroundColor.b() * 114
    ) / 1000;

    return (yiq >= 186) ? black : white;
}

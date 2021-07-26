export function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function rgbToHex({r, g, b}) {
    function hex(x) {
        return ('0' + parseInt(x).toString(16)).slice(-2);
    }
    return '#' + hex(r) + hex(g) + hex(b);
}

// returns {h,s,l} with range [0,1] for maximum precision in conversion
export function rgbToHsl({r, g, b}) {
    r = r / 255;
    g = g / 255;
    b = b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const delta = max - min;

        s = l > 0.5
            ? delta / (2 - max - min)
            : delta / (max + min);

        switch (max) {
        case r: h = (g - b) / delta + (g < b ? 6 : 0); break;
        case g: h = (b - r) / delta + 2; break;
        case b: h = (r - g) / delta + 4; break;
        }

        h = h / 6;
    }

    return {h, s, l};
}

// expects {h,s,l} in range [0,1], returns {r,g,b} in the range [0,255]
export function hslToRgb({h, s, l}) {
    let r, g, b;

    function hue2rgb(p, q, t) {
        if (t < 0) {
            t += 1;
        }
        if (t > 1) {
            t -= 1;
        }
        if (t < 1 / 6) {
            return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
            return q;
        }
        if (t < 2 / 3) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
    }

    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    r = r * 255;
    g = g * 255;
    b = b * 255;

    return {r, g, b};
}

// https://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
export function luminance({r, g, b}) {
    const a = [r, g, b].map(function (v) {
        v = v / 255;

        return v <= 0.03928
            ? v / 12.92
            : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// https://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef
export function contrast(rgb1, rgb2) {
    const lum1 = luminance(rgb1);
    const lum2 = luminance(rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
}

export function lightenToContrastThreshold(foregroundRgb, backgroundRgb, contrastThreshold) {
    let newRgb = foregroundRgb;

    while (contrast(newRgb, backgroundRgb) < contrastThreshold) {
        let {h,s,l} = rgbToHsl(newRgb);

        if (l >= 1) {
            break;
        }

        l = Math.min(l + 0.05, 1);
        newRgb = hslToRgb({h,s,l});
    }

    return newRgb;
}

export function darkenToContrastThreshold(foregroundRgb, backgroundRgb, contrastThreshold) {
    let newRgb = foregroundRgb;

    while (contrast(newRgb, backgroundRgb) < contrastThreshold) {
        let {h,s,l} = rgbToHsl(newRgb);

        if (l <= 0) {
            break;
        }

        l = Math.max(l - 0.05, 0);
        newRgb = hslToRgb({h,s,l});
    }

    return newRgb;
}

export function textColorForBackgroundColor({r,g,b}) {
    const whiteRgb = {r: 255, g: 255, b: 255};
    const blackRgb = {r: 0, g: 0, b: 0};

    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return (yiq >= 128) ? blackRgb : whiteRgb;
}

export const rgbToHex = (rgb) => {
    if (rgb === 'transparent') {
        return rgb;
    }

    try {
        // Extract the red, green, and blue values from the RGB string
        const [r, g, b] = rgb.match(/\d+/g);
        // Convert each component to hexadecimal
        const red = parseInt(r, 10).toString(16).padStart(2, '0');
        const green = parseInt(g, 10).toString(16).padStart(2, '0');
        const blue = parseInt(b, 10).toString(16).padStart(2, '0');
        // Concatenate the hexadecimal values
        const hex = `#${red}${green}${blue}`;
        return hex;
    } catch (e) {
        return null;
    }
};

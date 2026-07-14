export const rgbToHex = (rgb: string) => {
    if (rgb === 'transparent') {
        return rgb;
    }

    try {
        // Extract the red, green, and blue values from the RGB string
        const match = rgb.match(/\d+/g);
        if (!match) {
            return null;
        }
        const [r, g, b] = match;
        // Convert each component to hexadecimal
        const red = parseInt(r, 10).toString(16).padStart(2, '0');
        const green = parseInt(g, 10).toString(16).padStart(2, '0');
        const blue = parseInt(b, 10).toString(16).padStart(2, '0');
        // Concatenate the hexadecimal values
        const hex = `#${red}${green}${blue}`;
        return hex;
    } catch {
        return null;
    }
};

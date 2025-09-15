/**
 * Avatar generator utility for creating SVG-based avatar images
 * Replaces Gravatar functionality with locally generated avatars
 */

/**
 * Generates a consistent color based on a string (name or email)
 * Ported from gh-member-avatar.js
 * @param {string} str - The string to generate color from
 * @param {number} saturation - Saturation percentage (0-100)
 * @param {number} lightness - Lightness percentage (0-100)
 * @returns {string} HSL color string
 */
function stringToHslColor(str, saturation = 75, lightness = 55) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h = hash % 360;
    return `hsl(${h}, ${saturation}%, ${lightness}%)`;
}

/**
 * Extracts initials from a name or email
 * Ported from comments-ui helpers.ts
 * @param {string} nameOrEmail - The name or email to extract initials from
 * @returns {string} Initials (max 2 characters)
 */
function getInitials(nameOrEmail) {
    if (!nameOrEmail) {
        return 'AB';
    }

    // Check if it's an email
    if (nameOrEmail.includes('@')) {
        // Extract the part before @ for initials
        const username = nameOrEmail.split('@')[0];
        if (username.length > 0) {
            return username.substring(0, 1).toUpperCase();
        }
        return 'AB';
    }

    const parts = nameOrEmail.split(' ').filter(part => part.length > 0);

    if (parts.length === 0) {
        return 'AB';
    }

    if (parts.length === 1) {
        return parts[0].substring(0, 1).toUpperCase();
    }

    return parts[0].substring(0, 1).toUpperCase() + parts[parts.length - 1].substring(0, 1).toUpperCase();
}

/**
 * Creates an SVG avatar with initials
 * @param {string} initials - The initials to display (max 2 characters)
 * @param {string} colorHex - The background color in hex or HSL format
 * @returns {string} Base64 encoded data URL
 */
function createInitialsAvatar(initials, color) {
    const text = initials.slice(0, 2).toUpperCase();
    
    const svgContent = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="200" height="200" fill="${color}"/>
  <text x="100" y="120" font-family="Arial, sans-serif" font-size="72" font-weight="bold" text-anchor="middle" fill="white">${text}</text>
</svg>`;
    
    const base64 = Buffer.from(svgContent).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generates an avatar data URL for a member
 * @param {Object} member - The member object
 * @param {string} member.name - Member's name
 * @param {string} member.email - Member's email
 * @returns {string} Base64 encoded SVG data URL
 */
function generateMemberAvatar(member) {
    // Use name for both initials and color, fall back to email
    const nameForDisplay = member.name || member.email || 'Anonymous';
    const nameForColor = member.name || member.email || 'Anonymous';
    
    const initials = getInitials(nameForDisplay);
    const color = stringToHslColor(nameForColor, 75, 55);
    
    return createInitialsAvatar(initials, color);
}

module.exports = {
    stringToHslColor,
    getInitials,
    createInitialsAvatar,
    generateMemberAvatar
};
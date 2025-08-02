const {parseGatedBlockParams} = require('../../output/utils/post-gating');

// Match gated block comments - same regex as post-gating.js
const GATED_BLOCK_REGEX = /<!--kg-gated-block:begin ([^\n]+?)\s*-->([\s\S]*?)<!--kg-gated-block:end-->/g;

/**
 * Extracts gated block visibility settings from HTML before conversion to Lexical
 * and applies them to the converted Lexical cards
 * 
 * @param {string} html - HTML content with gated blocks
 * @param {Object} lexicalDoc - Converted Lexical document
 * @returns {Object} - Modified Lexical document with visibility applied to cards
 */
function preserveGatedBlockVisibility(html, lexicalDoc) {
    if (!html || !lexicalDoc) {
        return lexicalDoc;
    }

    // Extract gated blocks and their visibility settings
    const gatedBlocks = [];
    let match;
    
    // Reset regex to ensure we start from the beginning
    GATED_BLOCK_REGEX.lastIndex = 0;
    
    while ((match = GATED_BLOCK_REGEX.exec(html)) !== null) {
        const params = parseGatedBlockParams(match[1]);
        const content = match[2];
        
        // Extract identifying features from the gated content
        const contentIdentifiers = extractContentIdentifiers(content);
        
        gatedBlocks.push({
            params,
            content,
            contentIdentifiers,
            fullMatch: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length
        });
    }

    if (gatedBlocks.length === 0) {
        return lexicalDoc;
    }

    // Apply visibility settings to matching cards in Lexical document
    const modifiedDoc = JSON.parse(JSON.stringify(lexicalDoc)); // Deep clone
    
    gatedBlocks.forEach(block => {
        applyVisibilityToMatchingCards(modifiedDoc.root, block);
    });

    return modifiedDoc;
}

/**
 * Extracts identifying features from HTML content to match with Lexical cards
 * 
 * @param {string} content - HTML content within gated block
 * @returns {Object} - Identifying features of the content
 */
function extractContentIdentifiers(content) {
    const identifiers = {};
    
    // Extract CTA card specific identifiers
    const ctaTextMatch = content.match(/<div[^>]*kg-cta-text[^>]*>(.*?)<\/div>/s);
    if (ctaTextMatch) {
        identifiers.ctaText = ctaTextMatch[1].replace(/<[^>]*>/g, '').trim();
    }
    
    const buttonTextMatch = content.match(/<a[^>]*kg-cta-button[^>]*>(.*?)<\/a>/s);
    if (buttonTextMatch) {
        identifiers.buttonText = buttonTextMatch[1].replace(/<[^>]*>/g, '').trim();
    }
    
    const buttonUrlMatch = content.match(/href="([^"]*)"[^>]*kg-cta-button/);
    if (buttonUrlMatch) {
        identifiers.buttonUrl = buttonUrlMatch[1];
    }
    
    // Extract other card types as needed
    // Could be extended for image cards, embed cards, etc.
    
    return identifiers;
}

/**
 * Recursively applies visibility settings to cards that match the gated block content
 * 
 * @param {Object} node - Current Lexical node
 * @param {Object} gatedBlock - Gated block with visibility params and content
 */
function applyVisibilityToMatchingCards(node, gatedBlock) {
    if (!node || typeof node !== 'object') {
        return;
    }

    // Check if this is a card node that should have visibility applied
    if (node.type && isCardType(node.type)) {
        // Apply visibility if this card matches the gated block content
        if (shouldApplyVisibilityToCard(node, gatedBlock)) {
            node.visibility = buildVisibilityFromParams(gatedBlock.params);
        }
    }

    // Recursively process children
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
            applyVisibilityToMatchingCards(child, gatedBlock);
        });
    }
}

/**
 * Checks if the node type is a card that supports visibility
 * 
 * @param {string} type - Lexical node type
 * @returns {boolean}
 */
function isCardType(type) {
    // Card types that support visibility
    const cardTypes = [
        'call-to-action',
        'button',
        'paywall',
        'html',
        'markdown',
        'image',
        'gallery',
        'video',
        'embed',
        'bookmark',
        'file',
        'audio',
        'product'
    ];
    
    return cardTypes.includes(type);
}

/**
 * Determines if visibility should be applied to a specific card
 * Matches cards based on their content with the gated block content
 * 
 * @param {Object} cardNode - Lexical card node
 * @param {Object} gatedBlock - Gated block information
 * @returns {boolean}
 */
function shouldApplyVisibilityToCard(cardNode, gatedBlock) {
    const {contentIdentifiers} = gatedBlock;
    
    // For CTA cards, match based on text content and URLs
    if (cardNode.type === 'call-to-action') {
        const textMatches = !contentIdentifiers.ctaText || 
            (cardNode.textValue && cardNode.textValue.includes(contentIdentifiers.ctaText));
        const buttonTextMatches = !contentIdentifiers.buttonText || 
            (cardNode.buttonText && cardNode.buttonText.includes(contentIdentifiers.buttonText));
        const urlMatches = !contentIdentifiers.buttonUrl || 
            (cardNode.buttonUrl === contentIdentifiers.buttonUrl);
        
        return textMatches && buttonTextMatches && urlMatches;
    }
    
    // For other card types, apply basic matching
    // This could be enhanced with more specific matching logic per card type
    return true;
}

/**
 * Builds visibility object from gated block parameters
 * 
 * @param {Object} params - Parsed gated block parameters
 * @returns {Object} - Visibility object for Lexical card
 */
function buildVisibilityFromParams(params) {
    const visibility = {
        web: {
            nonMember: true,
            memberSegment: 'status:free,status:-free'
        },
        email: {
            memberSegment: 'status:free,status:-free'
        }
    };

    // Apply extracted parameters
    if (params.nonMember !== undefined) {
        visibility.web.nonMember = params.nonMember;
    }

    if (params.memberSegment !== undefined) {
        visibility.web.memberSegment = params.memberSegment;
        visibility.email.memberSegment = params.memberSegment;
    }

    return visibility;
}

module.exports = {
    preserveGatedBlockVisibility
};
import {faker} from "@faker-js/faker";

/**
 * Builders for Lexical documents (the JSON string stored in a post's
 * `lexical` field). One root-envelope scaffolding shared by the plain
 * paragraph form (post builder defaults) and the card-spec form
 * (e2e's PostFactory.createWithCards).
 */

interface LexicalTextNode {
    detail: number;
    format: number;
    mode: string;
    style: string;
    text: string;
    type: "text";
    version: number;
}

interface LexicalParagraphNode {
    children: LexicalTextNode[];
    direction: string;
    format: string;
    indent: number;
    type: "paragraph";
    version: number;
}

interface CardNode {
    type: string;
    [key: string]: unknown;
}

const CARD_DEFAULTS: Record<string, CardNode> = {
    transistor: {
        type: "transistor",
        version: 1,
        accentColor: "#15171A",
        backgroundColor: "#FFFFFF",
        visibility: {
            web: {
                nonMember: false,
                memberSegment: "status:free,status:-free"
            },
            email: {
                memberSegment: "status:free,status:-free"
            }
        }
    }
};

export type CardSpec = string | {[cardType: string]: Record<string, unknown>};

function resolveCard(spec: CardSpec): CardNode {
    if (typeof spec === "string") {
        const defaults = CARD_DEFAULTS[spec];
        if (!defaults) {
            // Test-only builder failing fast; @tryghost/errors' HTTP semantics don't apply here
            // eslint-disable-next-line ghost/ghost-custom/no-native-error
            throw new Error(`Unknown card type: "${spec}". Register it in CARD_DEFAULTS in lexical.ts.`);
        }
        return {...defaults};
    }

    const [cardType, overrides] = Object.entries(spec)[0];
    const defaults = CARD_DEFAULTS[cardType];
    if (!defaults) {
        // Test-only builder failing fast; @tryghost/errors' HTTP semantics don't apply here
        // eslint-disable-next-line ghost/ghost-custom/no-native-error
        throw new Error(`Unknown card type: "${cardType}". Register it in CARD_DEFAULTS in lexical.ts.`);
    }
    return {...defaults, ...overrides};
}

function buildParagraphNode(text: string): LexicalParagraphNode {
    return {
        children: [{
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text,
            type: "text",
            version: 1
        }],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
    };
}

/** Wrap child nodes in the Lexical root document envelope. */
function buildDocument(children: Array<LexicalParagraphNode | CardNode>): string {
    return JSON.stringify({
        root: {
            children,
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1
        }
    });
}

/** Lexical document containing a single paragraph with the given text. */
export function buildLexicalParagraph(text: string): string {
    return buildDocument([buildParagraphNode(text)]);
}

/**
 * Lexical document from card specs, each card sandwiched between marker
 * paragraphs. With no specs, a document with random paragraph content.
 */
export function buildLexical(...cards: CardSpec[]): string {
    if (cards.length === 0) {
        return buildLexicalParagraph(faker.lorem.paragraphs(3));
    }

    const children: Array<LexicalParagraphNode | CardNode> = [];
    for (const spec of cards) {
        const card = resolveCard(spec);
        children.push(buildParagraphNode(`Before ${card.type}`));
        children.push(card);
        children.push(buildParagraphNode(`After ${card.type}`));
    }

    return buildDocument(children);
}

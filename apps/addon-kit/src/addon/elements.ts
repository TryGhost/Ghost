import {createRemoteElement} from '@remote-dom/core/elements';

/**
 * The `gh-*` element vocabulary available to add-ons. Deliberately minimal:
 * it grows ad hoc when a real add-on hits a wall, never speculatively.
 * Styling is owned by the host — these definitions carry structure only.
 */

export type GhTextTone = 'default' | 'muted';
export type GhTextWeight = 'normal' | 'medium' | 'semibold';

export interface GhTextProperties {
    tone?: GhTextTone;
    weight?: GhTextWeight;
}

export const GhTextElement = createRemoteElement<GhTextProperties>({
    properties: {
        tone: {type: String},
        weight: {type: String}
    }
});

export type GhStackGap = 'sm' | 'md' | 'lg';

export interface GhStackProperties {
    gap?: GhStackGap;
}

export const GhStackElement = createRemoteElement<GhStackProperties>({
    properties: {
        gap: {type: String}
    }
});

export type GhInlineJustify = 'start' | 'between' | 'end';

export interface GhInlineProperties {
    gap?: GhStackGap;
    justify?: GhInlineJustify;
}

export const GhInlineElement = createRemoteElement<GhInlineProperties>({
    properties: {
        gap: {type: String},
        justify: {type: String}
    }
});

export type GhBadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

export interface GhBadgeProperties {
    variant?: GhBadgeVariant;
}

export const GhBadgeElement = createRemoteElement<GhBadgeProperties>({
    properties: {
        variant: {type: String}
    }
});

export type GhHeadingLevel = 2 | 3 | 4;

export interface GhHeadingProperties {
    level?: GhHeadingLevel;
}

export const GhHeadingElement = createRemoteElement<GhHeadingProperties>({
    properties: {
        level: {type: Number}
    }
});

export const GhSeparatorElement = createRemoteElement({});

export type GhStatDeltaDirection = 'up' | 'down' | 'same';

export interface GhStatProperties {
    label?: string;
    value?: string;
    delta?: string;
    deltaDirection?: GhStatDeltaDirection;
}

export const GhStatElement = createRemoteElement<GhStatProperties>({
    properties: {
        label: {type: String},
        value: {type: String},
        delta: {type: String},
        deltaDirection: {type: String}
    }
});

export type GhSparklineColor = 'blue' | 'green' | 'red';

export interface GhSparklineProperties {
    /** Data points, oldest first; the host spreads them over the past N days. */
    points?: number[];
    label?: string;
    color?: GhSparklineColor;
}

export const GhSparklineElement = createRemoteElement<GhSparklineProperties>({
    properties: {
        points: {type: Array},
        label: {type: String},
        color: {type: String}
    }
});

export interface GhTabsProperties {
    /** The value of the selected gh-tab. */
    value?: string;
}

export interface GhTabsEventListeners {
    /** Fired with the newly selected tab's value as `event.detail`. */
    change(event: CustomEvent<string>): void;
}

export const GhTabsElement = createRemoteElement<
    GhTabsProperties,
    Record<string, never>,
    Record<string, never>,
    GhTabsEventListeners
>({
    properties: {
        value: {type: String}
    },
    events: ['change']
});

export interface GhTabProperties {
    value?: string;
}

export const GhTabElement = createRemoteElement<GhTabProperties>({
    properties: {
        value: {type: String}
    }
});

export type GhButtonVariant = 'primary' | 'secondary' | 'destructive';

export interface GhButtonProperties {
    variant?: GhButtonVariant;
    disabled?: boolean;
}

export interface GhButtonEventListeners {
    press(event: Event): void;
}

export const GhButtonElement = createRemoteElement<
    GhButtonProperties,
    Record<string, never>,
    Record<string, never>,
    GhButtonEventListeners
>({
    properties: {
        variant: {type: String},
        disabled: {type: Boolean}
    },
    events: ['press']
});

export const GH_ELEMENT_TAGS = {
    'gh-text': GhTextElement,
    'gh-stack': GhStackElement,
    'gh-inline': GhInlineElement,
    'gh-badge': GhBadgeElement,
    'gh-heading': GhHeadingElement,
    'gh-separator': GhSeparatorElement,
    'gh-stat': GhStatElement,
    'gh-sparkline': GhSparklineElement,
    'gh-tabs': GhTabsElement,
    'gh-tab': GhTabElement,
    'gh-button': GhButtonElement
} as const;

export type GhElementTag = keyof typeof GH_ELEMENT_TAGS;

declare global {
    interface HTMLElementTagNameMap {
        'gh-text': InstanceType<typeof GhTextElement>;
        'gh-stack': InstanceType<typeof GhStackElement>;
        'gh-inline': InstanceType<typeof GhInlineElement>;
        'gh-badge': InstanceType<typeof GhBadgeElement>;
        'gh-heading': InstanceType<typeof GhHeadingElement>;
        'gh-separator': InstanceType<typeof GhSeparatorElement>;
        'gh-stat': InstanceType<typeof GhStatElement>;
        'gh-sparkline': InstanceType<typeof GhSparklineElement>;
        'gh-tabs': InstanceType<typeof GhTabsElement>;
        'gh-tab': InstanceType<typeof GhTabElement>;
        'gh-button': InstanceType<typeof GhButtonElement>;
    }
}

/**
 * Registers the `gh-*` custom elements in the current realm. Runs on import
 * of the authoring surface; guarded so repeated imports are safe.
 */
export function registerGhostElements(): void {
    for (const [tag, element] of Object.entries(GH_ELEMENT_TAGS)) {
        if (!customElements.get(tag)) {
            customElements.define(tag, element);
        }
    }
}

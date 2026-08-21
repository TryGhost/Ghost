import {defineEditorBlockRenderer} from '@tryghost/addon-kit/editor';
import {useMemo} from 'preact/hooks';
import type {AddonEditorBlockRequest} from '@tryghost/addon-kit/editor';

function SummaryDescription({description}: {description: string}) {
    const normalizedDescription = useMemo(() => description.trim(), [description]);

    return <p>{normalizedDescription}</p>;
}

function renderEditorBlock({blockName, props}: AddonEditorBlockRequest) {
    if (blockName !== 'seo-summary') {
        throw new Error(`Unknown editor block: ${blockName}`);
    }

    const title = typeof props.title === 'string' ? props.title : 'Search preview ready';
    const description = typeof props.description === 'string'
        ? props.description
        : 'This post has a title and description that are ready for search results.';

    return {
        content: (
            <article className="seo-summary">
                <span className="seo-summary__eyebrow">SEO Assistant</span>
                <h2>{title}</h2>
                <SummaryDescription description={description} />
                <span className="seo-summary__status">Looks good</span>
            </article>
        ),
        portableContent: (
            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
        ),
        css: `
            .seo-summary {
                box-sizing: border-box;
                min-height: 220px;
                padding: 32px;
                border: 1px solid #d9e5dd;
                border-radius: 16px;
                background: linear-gradient(135deg, #f4fbf6, #ffffff);
                color: #15261b;
                font-family: ui-sans-serif, system-ui, sans-serif;
            }
            .seo-summary__eyebrow {
                color: #41845a;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: .08em;
                text-transform: uppercase;
            }
            .seo-summary h2 { margin: 12px 0 8px; font-size: 24px; }
            .seo-summary p { margin: 0; color: #526359; line-height: 1.5; }
            .seo-summary__status {
                display: inline-block;
                margin-top: 20px;
                padding: 6px 10px;
                border-radius: 999px;
                background: #dff3e5;
                color: #28643c;
                font-size: 13px;
                font-weight: 600;
            }
        `,
        initialHeight: 240
    };
}

export default defineEditorBlockRenderer(renderEditorBlock);

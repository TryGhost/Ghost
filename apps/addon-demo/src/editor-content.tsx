import {defineEditorBlockRenderer} from '@tryghost/addon-kit/editor';
import {useMemo, useState} from 'preact/hooks';
import type {AddonEditorBlockRequest} from '@tryghost/addon-kit/editor';

function SummaryDescription({description}: {description: string}) {
    const normalizedDescription = useMemo(() => description.trim(), [description]);

    return <p>{normalizedDescription}</p>;
}

function SeoSummaryCard({title, description, showStatus}: {title: string; description: string; showStatus: boolean}) {
    const [showTip, setShowTip] = useState(false);

    return (
        <article className="seo-summary">
            <span className="seo-summary__eyebrow">SEO Assistant</span>
            <h2>{title}</h2>
            <SummaryDescription description={description} />
            {showStatus && <span className="seo-summary__status">Looks good</span>}
            <button className="seo-summary__tip-toggle" type="button" onClick={() => setShowTip(value => !value)}>
                {showTip ? 'Hide SEO tip' : 'Show SEO tip'}
            </button>
            {showTip && <p className="seo-summary__tip">Hydration keeps this interaction current without changing the saved fallback.</p>}
        </article>
    );
}

function renderEditorBlock({blockName, props}: AddonEditorBlockRequest) {
    if (blockName !== 'seo-summary') {
        throw new Error(`Unknown editor block: ${blockName}`);
    }

    const title = props.mode === 'custom' && typeof props.title === 'string' ? props.title : 'Search preview ready';
    const description = typeof props.description === 'string'
        ? props.description
        : 'This post has a title and description that are ready for search results.';

    return {
        content: (
            <SeoSummaryCard description={description} showStatus={props.showStatus !== false} title={title} />
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
            .seo-summary__tip-toggle {
                display: block;
                margin-top: 16px;
                border: 0;
                padding: 0;
                background: transparent;
                color: #28643c;
                cursor: pointer;
                font: inherit;
                font-weight: 600;
                text-decoration: underline;
            }
            .seo-summary .seo-summary__tip { margin-top: 10px; color: #28643c; }
        `,
        initialHeight: 240
    };
}

export default defineEditorBlockRenderer(renderEditorBlock, {hydrate: true});

import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import MarkdownEditor from './MarkdownCard/MarkdownEditor';
import {render as markdownRender} from '@tryghost/kg-markdown-html-renderer';
import {sanitizeHtml} from '../../../utils/sanitize-html';

interface MarkdownCardProps {
    markdown?: string;
    updateMarkdown?: (value: string) => void;
    isEditing?: boolean;
    imageUploader: (type: string) => unknown;
    unsplashConf?: unknown;
}

export function MarkdownCard({markdown = '', updateMarkdown, isEditing, imageUploader, unsplashConf}: MarkdownCardProps) {
    return (
        <>
            {isEditing
                ? (
                    <div className="markdown-editor">
                        <MarkdownEditor
                            imageUploader={imageUploader}
                            markdown={markdown}
                            unsplashConf={unsplashConf}
                            updateMarkdown={updateMarkdown}
                        />
                    </div>
                )
                : <MarkdownDisplay markdown={markdown} />
            }
        </>
    );
}

function MarkdownDisplay({markdown}: {markdown: string}) {
    const markdownHtml = markdownRender(markdown);
    const sanitizedHtml = sanitizeHtml(markdownHtml, {replaceJS: true});

    return (
        <div className="relative">
            <div dangerouslySetInnerHTML={{__html: sanitizedHtml}} className="whitespace-normal"></div>
            {/* Read-only overlay - prevents links etc being clickable and causing unexpected quits */}
            <div className="absolute inset-0 z-50 mt-0"></div>
        </div>
    );
}

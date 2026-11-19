import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import HtmlEditor from './HtmlCard/HtmlEditor';
import {sanitizeHtml} from '../../../utils/sanitize-html';

interface HtmlCardProps {
    html?: string;
    updateHtml?: (html: string) => void;
    isEditing?: boolean;
    darkMode?: boolean;
}

export function HtmlCard({html, updateHtml, isEditing, darkMode}: HtmlCardProps) {
    return (
        <>
            {isEditing
                ? (
                    <>
                        <HtmlEditor
                            darkMode={darkMode}
                            html={html}
                            updateHtml={updateHtml}
                        />
                    </>
                )
                : <div>
                    <HtmlDisplay html={html} />
                    <div className="absolute inset-0 z-50 mt-0"></div>
                </div>
            }
        </>
    );
}

function HtmlDisplay({html}: {html?: string}) {
    const sanitizedHtml = sanitizeHtml(html || '', {replaceJS: true});

    return <div dangerouslySetInnerHTML={{__html: sanitizedHtml}} className="min-h-[3.5vh] whitespace-normal"></div>;
}

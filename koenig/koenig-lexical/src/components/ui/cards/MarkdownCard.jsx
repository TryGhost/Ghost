import React from 'react';
import PropTypes from 'prop-types';
import MarkdownRenderer from '@tryghost/kg-markdown-html-renderer';
import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import MarkdownEditor from './MarkdownCard/MarkdownEditor';

export function MarkdownCard({markdown = '# Title', updateMarkdown, isEditing, imageUploader, unsplashConf}) {
    return (
        <>
            {isEditing
                ? (
                    <div className="markdown-editor">
                        <MarkdownEditor
                            markdown={markdown}
                            imageUploader={imageUploader}
                            updateMarkdown={updateMarkdown}
                            unsplashConf={unsplashConf}
                        />
                    </div>
                )
                : <MarkdownDisplay markdown={markdown} />
            }
        </>
    );
}

function MarkdownDisplay({markdown}) {
    const markdownHtml = MarkdownRenderer.render(markdown);
    return <div className="whitespace-normal" dangerouslySetInnerHTML={{__html: markdownHtml}}></div>;
}

MarkdownCard.propTypes = {
    markdown: PropTypes.string,
    updateMarkdown: PropTypes.func,
    imageUploader: PropTypes.func,
    isEditing: PropTypes.bool
};

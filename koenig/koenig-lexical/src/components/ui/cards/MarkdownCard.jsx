import React from 'react';
import PropTypes from 'prop-types';
import MarkdownRenderer from '@tryghost/kg-markdown-html-renderer';
import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import MarkdownEditor from './MarkdownCard/MarkdownEditor';

export function MarkdownCard({markdown = '# Title', updateMarkdown, isEditing, imageUploader, unsplashConf}) {
    return (
        <div className="markdown-editor">
            {isEditing
                ? (
                    <MarkdownEditor
                        markdown={markdown}
                        imageUploader={imageUploader}
                        updateMarkdown={updateMarkdown}
                        unsplashConf={unsplashConf}
                    />
                )
                : <MarkdownDisplay markdown={markdown} />
            }
        </div>
    );
}

function MarkdownDisplay({markdown}) {
    const markdownHtml = MarkdownRenderer.render(markdown);
    return <div dangerouslySetInnerHTML={{__html: markdownHtml}}></div>;
}

MarkdownCard.propTypes = {
    markdown: PropTypes.string,
    updateMarkdown: PropTypes.func,
    imageUploader: PropTypes.func,
    isEditing: PropTypes.bool
};

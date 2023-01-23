import React from 'react';
import PropTypes from 'prop-types';
import MarkdownRenderer from '@tryghost/kg-markdown-html-renderer';
import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import MarkdownEditor from './MarkdownCard/MarkdownEditor';

export function MarkdownCard({value = '', onChange, isEditing, imageUploader, unsplashConf}) {
    const markdown = MarkdownRenderer.render(value);
    return (
        <div className="markdown-editor">
            {isEditing
                ? (
                    <MarkdownEditor
                        value={value}
                        imageUploader={imageUploader}
                        onChange={onChange}
                        unsplashConf={unsplashConf}
                    />
                )
                : <div dangerouslySetInnerHTML={{__html: markdown}}></div>
            }
        </div>
    );
}

MarkdownCard.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    imageUploader: PropTypes.func,
    isEditing: PropTypes.bool
};

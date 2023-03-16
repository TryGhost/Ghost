import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import HtmlEditor from './HtmlCard/HtmlEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {sanitizeHtml} from '../../../utils/sanitize-html';

export function HtmlCard({html, updateHtml, isEditing}) {
    return (
        <>
            {isEditing
                ? (
                    <HtmlEditor
                        html={html}
                        updateHtml={updateHtml}
                    />
                )
                : <HtmlDisplay html={html} />
            }
        </>
    );
}

function HtmlDisplay({html}) {
    const sanitizedHtml = sanitizeHtml(html, {replaceJS: true});

    return <div dangerouslySetInnerHTML={{__html: sanitizedHtml}} className="whitespace-normal"></div>;
}

HtmlCard.propTypes = {
    html: PropTypes.string
};

import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import HtmlEditor from './HtmlCard/HtmlEditor';
import KoenigComposerContext from '../../../context/KoenigComposerContext.jsx';
import PropTypes from 'prop-types';
import React from 'react';
import {CardVisibilityMessage} from '../CardVisibilityMessage.jsx';
import {sanitizeHtml} from '../../../utils/sanitize-html';

export function HtmlCard({html, updateHtml, isEditing, darkMode, visibilityMessage}) {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {feature = {}} = cardConfig;
    const {contentVisibility, contentVisibilityAlpha} = feature;

    const displayVisibilityMessage = contentVisibility && !contentVisibilityAlpha;

    return (
        <>
            {isEditing
                ? (
                    <>
                        {displayVisibilityMessage && <CardVisibilityMessage message={visibilityMessage} />}
                        <HtmlEditor
                            darkMode={darkMode}
                            html={html}
                            updateHtml={updateHtml}
                        />
                    </>
                )
                : <div>
                    {displayVisibilityMessage && <CardVisibilityMessage message={visibilityMessage} />}
                    <HtmlDisplay html={html} />
                    <div className="absolute inset-0 z-50 mt-0"></div>
                </div>
            }
        </>
    );
}

function HtmlDisplay({html}) {
    const sanitizedHtml = sanitizeHtml(html, {replaceJS: true});

    return <div dangerouslySetInnerHTML={{__html: sanitizedHtml}} className="min-h-[3.5vh] whitespace-normal"></div>;
}

HtmlDisplay.propTypes = {
    html: PropTypes.string
};

HtmlCard.propTypes = {
    html: PropTypes.string,
    updateHtml: PropTypes.func,
    isEditing: PropTypes.bool,
    darkMode: PropTypes.bool,
    contentVisibility: PropTypes.element,
    visibilityMessage: PropTypes.string
};

import '@tryghost/kg-simplemde/dist/simplemde.min.css';
import HtmlEditor from './HtmlCard/HtmlEditor';
import KoenigComposerContext from '../../../context/KoenigComposerContext.jsx';
import PropTypes from 'prop-types';
import React from 'react';
import {sanitizeHtml} from '../../../utils/sanitize-html';

export function HtmlCard({html, updateHtml, isEditing, darkMode}) {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const isContentVisibilityEnabled = cardConfig?.feature?.contentVisibility || false;

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
                    {isContentVisibilityEnabled &&
                        <div className="pb-2 pt-[.6rem] font-sans text-xs font-semibold uppercase leading-8 tracking-normal text-grey dark:text-grey-800">
                            Shown in email to free subscribers
                        </div>}
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
    contentVisibility: PropTypes.element
};

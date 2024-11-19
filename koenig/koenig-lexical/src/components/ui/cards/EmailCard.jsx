import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import ReplacementStringsPlugin from '../../../plugins/ReplacementStringsPlugin';
import {CardVisibilityMessage} from '../CardVisibilityMessage.jsx';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';

export function EmailCard({htmlEditor, htmlEditorInitialState, isEditing}) {
    return (
        <>
            <CardVisibilityMessage message="Hidden on website" />
            <div className="w-full">
                <KoenigNestedEditor
                    autoFocus={true}
                    initialEditor={htmlEditor}
                    initialEditorState={htmlEditorInitialState}
                    nodes='basic'
                    textClassName='kg-email-html whitespace-normal pb-1'
                >
                    <ReplacementStringsPlugin />
                </KoenigNestedEditor>

                {!isEditing && <ReadOnlyOverlay />}
            </div>
        </>
    );
}

EmailCard.propTypes = {
    htmlEditor: PropTypes.object,
    isEditing: PropTypes.bool,
    htmlEditorInitialState: PropTypes.object
};

EmailCard.defaultProps = {
    isEditing: false
};

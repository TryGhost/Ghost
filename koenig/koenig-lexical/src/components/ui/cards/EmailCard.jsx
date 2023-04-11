import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {ReactComponent as HelpIcon} from '../../../assets/icons/help.svg';

export function EmailCard({htmlEditor, htmlEditorInitialState, isEditing}) {
    return (
        <div className="w-full">
            <KoenigNestedEditor
                autoFocus={true}
                initialEditor={htmlEditor}
                initialEditorState={htmlEditorInitialState}
                nodes='basic'
                textClassName='kg-email-html whitespace-normal'
            />

            {isEditing &&
                <div className="-mx-3 mt-3 flex items-center justify-center bg-grey-100 p-2 font-sans text-sm font-normal leading-none text-grey-600">
                    Only visible when delivered by email, this card will not be published on your site.
                    <a href="https://ghost.org/help/email-newsletters/#email-cards" rel="noopener noreferrer" target="_blank">
                        <HelpIcon className="ml-1 mt-[1px] h-4 w-4 stroke-[1.2px] text-grey-600" />
                    </a>
                </div>
            }

            {!isEditing && <div className="absolute top-0 z-10 m-0 h-full w-full cursor-default p-0"></div>}
        </div>
    );
}

EmailCard.propTypes = {
    htmlEditor: PropTypes.object,
    isEditing: PropTypes.bool
};

EmailCard.defaultProps = {
    isEditing: false
};

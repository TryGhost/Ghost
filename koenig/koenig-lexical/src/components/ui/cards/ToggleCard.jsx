import KoenigToggleEditor from '../../KoenigToggleEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {ReactComponent as ArrowDownIcon} from '../../../assets/icons/kg-toggle-arrow.svg';

export function ToggleCard({
    contentEditor,
    contentPlaceholder,
    headerEditor,
    headerPlaceholder,
    isContentVisible,
    isEditing,
    toggleContent,
    toggleRef
}) {
    return (
        <>
            <div className='rounded border border-grey/40 py-4 px-6 dark:border-grey/30'>
                <div className='flex cursor-text items-start justify-between'>
                    <div className="mr-2 w-full">
                        <KoenigToggleEditor
                            autoFocus={true}
                            focusNext={contentEditor}
                            initialEditor={headerEditor}
                            nodes='minimal'
                            placeholderClassName={'kg-toggle-header-placeholder'}
                            placeholderText={headerPlaceholder}
                            singleParagraph={true}
                            textClassName={'kg-toggle-header-text'}
                        />
                    </div>
                    <div ref={toggleRef} className='z-20 ml-auto mt-[-1px] flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center' onClick={toggleContent}>
                        <ArrowDownIcon className={`h-4 w-4 stroke-2 text-grey-400 dark:text-grey/30 ${isContentVisible ? 'rotate-180' : 'rotate-0'}`} />
                    </div>
                </div>
                <div className={`mt-2 w-full ${isContentVisible ? 'visible' : 'hidden'}`}>
                    <KoenigToggleEditor
                        initialEditor={contentEditor}
                        placeholderClassName={'kg-toggle-content-placeholder'}
                        placeholderText={contentPlaceholder}
                        textClassName={'kg-toggle-content-text'}
                    />
                </div>
            </div>
            {!isEditing && <div className="absolute top-0 z-10 m-0 h-full w-full cursor-default p-0"></div>}
        </>
    );
}

ToggleCard.propTypes = {
    contentPlaceholder: PropTypes.string,
    headerPlaceholder: PropTypes.string,
    isContentVisible: PropTypes.bool,
    isEditing: PropTypes.bool,
    toggleRef: PropTypes.object
};

ToggleCard.defaultProps = {
    contentPlaceholder: 'Collapsible content',
    headerPlaceholder: 'Toggle header',
    isContentVisible: true,
    isEditing: false
};

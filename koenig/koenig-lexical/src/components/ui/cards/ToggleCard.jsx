import KoenigToggleEditor from '../../KoenigToggleEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {ReactComponent as ArrowDownIcon} from '../../../assets/icons/kg-toggle-arrow.svg';
import {sanitizeHtml} from '../../../utils/sanitize-html';

export function ToggleCard({
    content,
    contentPlaceholder,
    focusOnContent,
    focusOnHeader,
    header,
    headerPlaceholder,
    isContentFocused,
    isContentVisible,
    isEditing,
    isHeaderFocused,
    setContent,
    setHeader,
    toggleContent,
    toggleRef
}) {
    return (
        <div className='rounded border border-grey/40 py-4 px-6 dark:border-grey/30'>
            <div className='flex cursor-text items-start justify-between'>
                <div className="mr-2 w-full" onClick={focusOnHeader} onKeyDown={focusOnContent}>
                    {
                        isEditing ?
                            <KoenigToggleEditor
                                autoFocus={isHeaderFocused}
                                placeholderClassName={'kg-toggle-header-placeholder'}
                                placeholderText={headerPlaceholder}
                                readOnly={!isEditing}
                                setText={setHeader}
                                singleParagraph={true}
                                text={header}
                                textClassName={'kg-toggle-header-text'}
                            /> :
                            <div dangerouslySetInnerHTML={{__html: sanitizeHtml(header)}} className='kg-toggle-header-text'></div>
                    }

                </div>
                <div ref={toggleRef} className='ml-auto mt-[-1px] flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center' onClick={toggleContent}>
                    <ArrowDownIcon className={`h-4 w-4 stroke-2 text-grey-400 dark:text-grey/30 ${isContentVisible ? 'rotate-180' : 'rotate-0'}`} />
                </div>
            </div>
            <div className={`mt-2 w-full ${isContentVisible ? 'visible' : 'hidden'}`}>
                {
                    isEditing ?
                        <KoenigToggleEditor
                            autoFocus={isContentFocused}
                            placeholderClassName={'kg-toggle-content-placeholder'}
                            placeholderText={contentPlaceholder}
                            readOnly={!isEditing}
                            setText={setContent}
                            text={content}
                            textClassName={'kg-toggle-content-text'}
                        /> :
                        <div dangerouslySetInnerHTML={{__html: sanitizeHtml(content)}} className='kg-toggle-content-text'></div>
                }
            </div>
        </div>
    );
}

ToggleCard.propTypes = {
    content: PropTypes.string,
    contentPlaceholder: PropTypes.string,
    focusOnContent: PropTypes.func,
    focusOnHeader: PropTypes.func,
    header: PropTypes.string,
    headerPlaceholder: PropTypes.string,
    isContentFocused: PropTypes.bool,
    isContentVisible: PropTypes.bool,
    isEditing: PropTypes.bool,
    isHeaderFocused: PropTypes.bool,
    setContent: PropTypes.func,
    setHeader: PropTypes.func,
    toggleContent: PropTypes.func,
    toggleRef: PropTypes.object
};

ToggleCard.defaultProps = {
    content: '',
    contentPlaceholder: 'Collapsible content',
    header: '',
    headerPlaceholder: 'Toggle header',
    isContentFocused: false,
    isContentVisible: false,
    isEditing: false,
    isHeaderFocused: true
};
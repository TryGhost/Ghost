import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {ReactComponent as ArrowDownIcon} from '../../../assets/icons/kg-toggle-arrow.svg';

export function ToggleCard({
    contentEditor,
    contentEditorInitialState,
    contentPlaceholder,
    headerEditor,
    headerEditorInitialState,
    headerPlaceholder,
    isEditing
}) {
    return (
        <>
            <div className='rounded border border-grey/40 py-4 px-6 dark:border-grey/30'>
                <div className='flex cursor-text items-start justify-between'>
                    <div className="mr-2 w-full">
                        <KoenigNestedEditor
                            autoFocus={true}
                            focusNext={contentEditor}
                            initialEditor={headerEditor}
                            initialEditorState={headerEditorInitialState}
                            nodes='minimal'
                            placeholderClassName={'!font-sans !text-[2.2rem] !font-bold !leading-snug !tracking-tight text-black dark:text-grey-50 opacity-40'}
                            placeholderText={headerPlaceholder}
                            singleParagraph={true}
                            textClassName={'koenig-lexical-toggle-header whitespace-normal text-black dark:text-grey-50 opacity-100'}
                        />
                    </div>
                    <div className='z-20 ml-auto !mt-[-1px] flex h-8 w-8 shrink-0 items-center justify-center'>
                        <ArrowDownIcon className={'h-4 w-4 stroke-2 text-grey-400 dark:text-grey/30'} />
                    </div>
                </div>
                <div className={'!mt-2 w-full'}>
                    <KoenigNestedEditor
                        initialEditor={contentEditor}
                        initialEditorState={contentEditorInitialState}
                        placeholderClassName={'font-serif text-xl font-normal leading-normal text-grey-900 dark:text-grey-100 opacity-40'}
                        placeholderText={contentPlaceholder}
                        textClassName={'koenig-lexical-toggle-description whitespace-normal font-serif text-xl font-normal leading-normal text-grey-900 dark:text-grey-100 opacity-100'}
                    />
                </div>
            </div>
            {!isEditing && <div className="absolute top-0 z-10 m-0 h-full w-full cursor-default p-0"></div>}
        </>
    );
}

ToggleCard.propTypes = {
    contentEditor: PropTypes.object,
    contentPlaceholder: PropTypes.string,
    headerEditor: PropTypes.object,
    headerPlaceholder: PropTypes.string,
    isEditing: PropTypes.bool
};

ToggleCard.defaultProps = {
    contentPlaceholder: 'Collapsible content',
    headerPlaceholder: 'Toggle header',
    isEditing: false
};

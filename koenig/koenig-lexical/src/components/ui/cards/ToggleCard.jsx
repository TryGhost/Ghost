import PropTypes from 'prop-types';
import React from 'react';
import {ReactComponent as ArrowDownIcon} from '../../../assets/icons/kg-toggle-arrow.svg';

export function ToggleCard({isEditing, header, headerPlaceholder, content, contentPlaceholder}) {
    return (
        <div className="rounded border border-grey/40 py-4 px-6 dark:border-grey/30">
            <div className="flex items-start justify-between">
                { (isEditing || header) &&
                    <div className={`mr-2 font-sans text-xl font-bold leading-snug text-black dark:text-grey-50 ${header ? 'opacity-100' : 'opacity-40'}`}>
                        {header || headerPlaceholder}
                    </div>
                }
                <div className="ml-auto -mt-[1px] flex h-8 w-8 shrink-0 items-center justify-center">
                    <ArrowDownIcon className="h-4 w-4 stroke-2 text-grey-400 dark:text-grey/30" />
                </div>
            </div>
            { (isEditing || content) &&
                <div className={`mt-2 w-full font-serif text-xl font-normal leading-normal text-grey-900 dark:text-grey-100 ${content ? 'opacity-100' : 'opacity-40'} `}>
                    {content || contentPlaceholder}
                </div>
            }
        </div>
    );
}

ToggleCard.propTypes = {
    header: PropTypes.string,
    headerPlaceholder: PropTypes.string,
    content: PropTypes.string,
    contentPlaceholder: PropTypes.string
};
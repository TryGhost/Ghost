import React from 'react';
import {formatNumber} from '../../utils/helpers';
import {useAppContext} from '../../AppContext';

type Props = {
    loadMore: () => void;
    count: number;
};
const RepliesPagination: React.FC<Props> = ({loadMore, count}) => {
    const {t} = useAppContext();
    const longText = count === 1 ? t('Show 1 more reply') : t('Show {{amount}} more replies', {amount: formatNumber(count)});
    const shortText = t('{{amount}} more', {amount: formatNumber(count)});

    return (
        <div className="flex w-full items-center justify-start" data-testid="replies-pagination">
            <button className="text-md group mb-10 ml-[48px] flex w-auto items-center px-0 pb-2 pt-0 text-left font-sans font-semibold text-neutral-700 sm:mb-12 dark:text-white " data-testid="reply-pagination-button" type="button" onClick={loadMore}>
                <span className="flex h-[40px] w-auto items-center justify-center whitespace-nowrap rounded-[6px] bg-black/5 px-4 py-2 text-center font-sans text-sm font-semibold text-neutral-700 outline-0 transition-all duration-150 hover:bg-black/10 dark:bg-white/15 dark:text-neutral-300 dark:hover:bg-white/20 dark:hover:text-neutral-100">↓ <span className="ml-1 hidden sm:inline">{longText}</span><span className="ml-1 inline sm:hidden">{shortText}</span>                </span>
            </button>
        </div>
    );
};

export default RepliesPagination;

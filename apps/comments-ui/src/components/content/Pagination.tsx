import {formatNumber} from '../../utils/helpers';
import {useAppContext, useLabs} from '../../AppContext';

const Pagination = () => {
    const {pagination, dispatchAction, t} = useAppContext();
    const labs = useLabs();

    const loadMore = () => {
        dispatchAction('loadMoreComments', {});
    };

    if (!pagination) {
        return null;
    }

    const left = pagination.total - pagination.page * pagination.limit;

    if (left <= 0) {
        return null;
    }

    // TODO: add i18n support for these strings when removing labs flag
    const text = labs.commentImprovements
        ? (left === 1 ? 'Load more (1)' : `Load more (${formatNumber(left)})`)
        : (left === 1 ? t('Show 1 previous comment') : t('Show {{amount}} previous comments', {amount: formatNumber(left)}));

    return (
        labs.commentImprovements ? (
            <button className="text-md group mb-10 flex items-center px-0 pb-2 pt-0 text-left font-sans font-semibold text-neutral-700 dark:text-white" data-testid="pagination-component" type="button" onClick={loadMore}>
                <span className="flex h-[40px] items-center justify-center whitespace-nowrap rounded-[6px] bg-black/5 px-4 py-2 text-center font-sans text-sm font-semibold text-neutral-700 outline-0 transition-all duration-150 hover:bg-black/10 dark:bg-white/15 dark:text-neutral-300 dark:hover:bg-white/20 dark:hover:text-neutral-100">{text}</span>
            </button>
        ) : (
            <button className="text-md group mb-10 flex w-full items-center px-0 pb-2 pt-0 text-left font-sans font-semibold text-neutral-700 dark:text-white" data-testid="pagination-component" type="button" onClick={loadMore}>
                <span className="flex h-[40px] w-full items-center justify-center whitespace-nowrap rounded-[6px] bg-black/5 px-3 py-2 text-center font-sans text-sm font-semibold text-neutral-700 outline-0 transition-all duration-150 hover:bg-black/10 dark:bg-white/15 dark:text-neutral-300 dark:hover:bg-white/20 dark:hover:text-neutral-100">↑ {text}</span>
            </button>
        )
    );
};

export default Pagination;

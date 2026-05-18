import PinIcon from '../../images/icons/pin.svg?react';
import PinOffIcon from '../../images/icons/pin-off.svg?react';
import React from 'react';
import {Comment, useAppContext, useLabs} from '../../app-context';

const PinnedLabel: React.FC<{comment: Comment}> = ({comment}) => {
    const {dispatchAction, isAdmin, t} = useAppContext();
    const labs = useLabs();

    if (labs?.commentsPinning !== true || !comment.pinned) {
        return null;
    }

    const labelClassName = 'inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 font-sans text-xs font-medium leading-none text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100';

    if (isAdmin) {
        const handleUnpinClick = (event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            dispatchAction('unpinComment', comment);
        };

        return (
            <button aria-label={t('Unpin comment')} className={`${labelClassName} group hover:border-amber-400 hover:bg-amber-100 dark:hover:border-amber-400/50 dark:hover:bg-amber-400/20`} data-testid="pinned-comment-label" type="button" onClick={handleUnpinClick}>
                <span className="grid size-3 shrink-0">
                    <PinIcon aria-hidden="true" className="col-start-1 row-start-1 size-3 group-hover:opacity-0 group-focus-visible:opacity-0" />
                    <PinOffIcon aria-hidden="true" className="col-start-1 row-start-1 size-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                </span>
                <span className="grid justify-items-start text-left">
                    <span className="col-start-1 row-start-1 group-hover:opacity-0 group-focus-visible:opacity-0">{t('Pinned')}</span>
                    <span className="col-start-1 row-start-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">{t('Unpin')}</span>
                </span>
            </button>
        );
    }

    return (
        <span className={labelClassName} data-testid="pinned-comment-label">
            <PinIcon aria-hidden="true" className="size-3" />
            {t('Pinned')}
        </span>
    );
};

export default PinnedLabel;

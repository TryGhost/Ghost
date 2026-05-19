import ExternalLinkIcon from '../../../images/icons/external-link.svg?react';
import EyeIcon from '../../../images/icons/eye.svg?react';
import EyeOffIcon from '../../../images/icons/eye-off.svg?react';
import PencilIcon from '../../../images/icons/pencil.svg?react';
import PinIcon from '../../../images/icons/pin.svg?react';
import PinOffIcon from '../../../images/icons/pin-off.svg?react';
import TrashIcon from '../../../images/icons/trash.svg?react';
import {Comment, useAppContext, useLabs} from '../../../app-context';

type Props = {
    comment: Comment;
    close: () => void;
    showAuthorActions?: boolean;
    toggleEdit?: () => void;
};
const AdminContextMenu: React.FC<Props> = ({comment, close, showAuthorActions = false, toggleEdit}) => {
    const {dispatchAction, t, adminUrl} = useAppContext();
    const labs = useLabs();

    const closeAfter = (action: () => void) => () => {
        action();
        close();
    };

    const editComment = toggleEdit && closeAfter(toggleEdit);
    const deleteComment = closeAfter(() => {
        dispatchAction('openPopup', {
            type: 'deletePopup',
            comment
        });
    });
    const hideComment = closeAfter(() => dispatchAction('hideComment', comment));
    const showComment = closeAfter(() => dispatchAction('showComment', comment));
    const pinComment = closeAfter(() => dispatchAction('pinComment', comment));
    const unpinComment = closeAfter(() => dispatchAction('unpinComment', comment));

    const isHidden = comment.status !== 'published';
    const canPin = labs?.commentsPinning === true && !comment.parent_id && comment.status !== 'deleted';
    const adminCommentUrl = adminUrl ? `${adminUrl}#/comments/?id=is:${comment.id}` : null;
    const baseItemClassName = 'flex w-full items-center gap-3 rounded px-3 py-2 text-left text-[14px] leading-5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700';
    const itemClassName = `${baseItemClassName} text-neutral-900 dark:text-white`;
    const destructiveItemClassName = `${baseItemClassName} text-red-600 dark:text-red-500`;
    const iconClassName = 'size-4 shrink-0';

    return (
        <div className="flex w-full flex-col gap-0.5">
            {labs?.commentModeration && adminCommentUrl && (
                <a
                    className={itemClassName}
                    data-testid="view-in-admin-button"
                    href={adminCommentUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    onClick={close}
                >
                    <ExternalLinkIcon aria-hidden="true" className={iconClassName} />
                    <span>{t('View in admin')}</span>
                </a>
            )}
            {canPin && (
                comment.pinned ?
                    <button className={itemClassName} data-testid="unpin-button" type="button" onClick={unpinComment}>
                        <PinOffIcon aria-hidden="true" className={iconClassName} />
                        <span>{t('Unpin comment')}</span>
                    </button>
                    :
                    <button className={itemClassName} data-testid="pin-button" type="button" onClick={pinComment}>
                        <PinIcon aria-hidden="true" className={iconClassName} />
                        <span>{t('Pin comment')}</span>
                    </button>
            )}
            {
                isHidden ?
                    <button className={itemClassName} data-testid="show-button" type="button" onClick={showComment}>
                        <EyeIcon aria-hidden="true" className={iconClassName} />
                        <span>{t('Show comment')}</span>
                    </button>
                    :
                    <button className={itemClassName} data-testid="hide-button" type="button" onClick={hideComment}>
                        <EyeOffIcon aria-hidden="true" className={iconClassName} />
                        <span>{t('Hide comment')}</span>
                    </button>
            }
            {showAuthorActions && (
                <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
            )}
            {showAuthorActions && editComment && (
                <button className={itemClassName} data-testid="edit" type="button" onClick={editComment}>
                    <PencilIcon aria-hidden="true" className={iconClassName} />
                    <span>{t('Edit')}</span>
                </button>
            )}
            {showAuthorActions && (
                <button className={destructiveItemClassName} data-testid="delete" type="button" onClick={deleteComment}>
                    <TrashIcon aria-hidden="true" className={iconClassName} />
                    <span>{t('Delete')}</span>
                </button>
            )}
        </div>
    );
};

export default AdminContextMenu;

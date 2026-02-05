import {Comment, useAppContext, useLabs} from '../../../app-context';
import {useAdminActions} from '../../admin-actions';
import {useCommentApi} from '../../comment-api-provider';

type Props = {
    comment: Comment;
    close: () => void;
};
const AdminContextMenu: React.FC<Props> = ({comment, close}) => {
    const {t} = useAppContext();
    const {adminUrl} = useCommentApi();
    const labs = useLabs();
    const adminActions = useAdminActions();

    const hideComment = () => {
        adminActions.hideComment(comment.id);
        close();
    };

    const showComment = () => {
        adminActions.showComment(comment.id);
        close();
    };

    const isHidden = comment.status !== 'published';
    const adminCommentUrl = adminUrl ? `${adminUrl}#/comments/?id=is:${comment.id}` : null;

    return (
        <div className="flex w-full flex-col gap-0.5">
            {
                isHidden ?
                    <button className="w-full rounded px-2.5 py-1.5 text-left text-[14px] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700" data-testid="show-button" type="button" onClick={showComment}>
                        <span className="hidden sm:inline">{t('Show comment')}</span><span className="sm:hidden">{t('Show')}</span>
                    </button>
                    :
                    <button className="w-full rounded px-2.5 py-1.5 text-left text-[14px] text-red-600 transition-colors hover:bg-neutral-100 dark:text-red-500 dark:hover:bg-neutral-700" data-testid="hide-button" type="button" onClick={hideComment}>
                        <span className="hidden sm:inline">{t('Hide comment')}</span><span className="sm:hidden">{t('Hide')}</span>
                    </button>
            }
            {labs?.commentModeration && adminCommentUrl && (
                <a
                    className="w-full rounded px-2.5 py-1.5 text-left text-[14px] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    data-testid="view-in-admin-button"
                    href={adminCommentUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    onClick={close}
                >
                    {t('View in admin')}
                </a>
            )}
        </div>
    );
};

export default AdminContextMenu;

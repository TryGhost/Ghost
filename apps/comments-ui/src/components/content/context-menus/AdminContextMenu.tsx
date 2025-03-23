import {Comment, useAppContext} from '../../../AppContext';

type Props = {
    comment: Comment;
    close: () => void;
};
const AdminContextMenu: React.FC<Props> = ({comment, close}) => {
    const {dispatchAction, t} = useAppContext();

    const hideComment = () => {
        dispatchAction('hideComment', comment);
        close();
    };

    const showComment = () => {
        dispatchAction('showComment', comment);
        close();
    };

    const isHidden = comment.status !== 'published';

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
        </div>
    );
};

export default AdminContextMenu;

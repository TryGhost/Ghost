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
        <div className="flex flex-col">
            {
                isHidden ?
                    <button className="w-full text-left text-[14px]" type="button" onClick={showComment}>
                        <span className="hidden sm:inline">{t('Show comment')}</span><span className="sm:hidden">{t('Show')}</span>
                    </button>
                    :
                    <button className="w-full text-left text-[14px]" type="button" onClick={hideComment}>
                        <span className="hidden text-red-600 sm:inline">{t('Hide comment')}</span><span className="text-red-600 sm:hidden">{t('Hide')}</span>
                    </button>
            }
        </div>
    );
};

export default AdminContextMenu;

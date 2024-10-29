import {Comment, useAppContext} from '../../../AppContext';

type Props = {
    comment: Comment;
};

const AdminButton: React.FC<Props> = ({comment}) => {
    const {dispatchAction, t} = useAppContext();

    const hideComment = () => {
        dispatchAction('hideComment', comment);
    };

    const showComment = () => {
        dispatchAction('showComment', comment);
    };

    const isHidden = comment.status !== 'published';

    return (
        <div className="flex shrink-0 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
            {isHidden ? (
                <button 
                    className="ml-2 whitespace-nowrap text-base leading-snug text-green-600 hover:text-green-700 sm:text-sm" 
                    type="button" 
                    onClick={showComment}
                >
                    {t('Show comment')}
                </button>
            ) : (
                <button 
                    className="ml-2 whitespace-nowrap text-base leading-snug text-red-600 hover:text-red-700 sm:text-sm" 
                    type="button" 
                    onClick={hideComment}
                >
                    {t('Hide comment')}
                </button>
            )}
        </div>
    );
};

export default AdminButton;
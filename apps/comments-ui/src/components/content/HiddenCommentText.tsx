import {useAppContext, useLabs} from '../../AppContext';

interface HiddenCommentTextProps {
    notPublishedMessage: string;
}

export const HiddenCommentText: React.FC<HiddenCommentTextProps> = ({notPublishedMessage}) => {
    const {t} = useAppContext();
    const message: string = notPublishedMessage;
    const labs = useLabs();

    if (labs.commentsImprovements) {
        return (
            <div>
                <p 
                    dangerouslySetInnerHTML={{__html: message}} 
                    className="text-md mt-[4px] font-sans italic leading-normal text-black/20 sm:text-lg dark:text-white/35" 
                />
                <p className='text-red-400'>{t('Hidden - not visible to members')}</p>
            </div>
        );
    }

    return (
        <p className="text-md mt-[4px] font-sans italic leading-normal text-black/20 sm:text-lg dark:text-white/35">
            {message}
        </p>
    );
};

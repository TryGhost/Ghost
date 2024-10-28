import ArticleModal from '../components/feed/ArticleModal';
import NiceModal from '@ebay/nice-modal-react';
import {type Activity} from '../components/activities/ActivityItem';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {useState} from 'react';

export function useArticleModal() {
    const [articleContent, setArticleContent] = useState<ObjectProperties | null>(null);
    const [articleActor, setArticleActor] = useState<ActorProperties | null>(null);

    const handleViewContent = (
        object: ObjectProperties, 
        contentActor: ActorProperties, 
        comments: Activity[], 
        focusReply = false
    ) => {
        setArticleContent(object);
        setArticleActor(contentActor);
        NiceModal.show(ArticleModal, {object, actor: contentActor, comments, focusReply});
    };

    return {
        articleContent,
        articleActor,
        handleViewContent
    };
}

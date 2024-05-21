import ActivityPubComponent from './components/ListIndex';
import ViewArticle from './components/ViewArticle';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const MainContent = () => {
    const {route} = useRouting();

    if (route === 'view') {
        return <ViewArticle object={{}} onBackToList={() => {}}/>;
    } else {
        return <ActivityPubComponent />;
    }
};

export default MainContent;

import DetailPage from './DetailPage';
import ListPage from './ListPage';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const MainContent = () => {
    const {route} = useRouting();

    if (route === 'detail') {
        return <DetailPage />;
    } else {
        return <ListPage />;
    }
};

export default MainContent;

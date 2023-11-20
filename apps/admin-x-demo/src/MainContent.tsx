import {Button} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const MainContent = () => {
    const {updateRoute} = useRouting();

    return <div>
        <Button label='Open modal' onClick={() => updateRoute('demo-modal')} />
    </div>;
};

export default MainContent;

import {Button} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const DetailPage: React.FC = () => {
    const {updateRoute} = useRouting();

    return <>Detail page <Button label='Back' onClick={() => updateRoute('')} /></>;
};

export default DetailPage;

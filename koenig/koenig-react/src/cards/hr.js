import createComponentCard from '../utils/create-component-card';
import Card from '../components/Card';

const HrCardComponent = ({...props}) => {
    return (
        <Card {...props}>
            <hr className='my-4 mx-0 border-grey-light' />
        </Card>
    );
};

const HrCard = createComponentCard({
    name: 'hr',
    component: HrCardComponent,
    koenigOptions: {
        hasEditMode: false,
        selectAfterInsert: false
    }
});

export default HrCard;

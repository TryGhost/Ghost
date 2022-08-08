import createComponentCard from '../utils/create-component-card';
import Card from '../components/Card';

const HrCardComponent = ({...props}) => {
    return (
        <Card {...props}>
            <hr />
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

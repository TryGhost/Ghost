import createComponentCard from '../utils/create-component-card';
import Card from '../components/Card';
import HrCardIcon from '../icons/kg-card-type-divider.svg';

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
        selectAfterInsert: false,
        cardMenu: {
            group: 'Primary',
            label: 'Divider',
            desc: 'Insert a dividing line',
            IconComponent: HrCardIcon,
            iconClass: '',
            matches: ['divider', 'horizontal-rule', 'hr'],
            type: 'card',
            replaceArg: 'hr'
        }
    }
});

export default HrCard;

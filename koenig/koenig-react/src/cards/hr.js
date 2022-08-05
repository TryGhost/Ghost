import createComponentCard from '../utils/create-component-card';
import Card from '../components/Card';

const HrCardComponent = ({...props}) => {
    return (
        <Card
            className="kg-card-hover"
            isSelected={props.isSelected}
            isEditing={props.isEditing}
            selectCard={props.selectCard}
            deselectCard={props.deselectCard}
            editCard={props.editCard}
            hasEditMode={false}
            editor={props.editor}
        >
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

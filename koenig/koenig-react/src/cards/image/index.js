import createComponentCard from '../../utils/create-component-card';
import Card from '../../components/Card';
import Image from './Image';

const ImageCardComponent = ({...props}) => {
    return (
        <Card
            className="kg-card-hover"
            isSelected={props.isSelected}
            isEditing={props.isEditing}
            selectCard={props.selectCard}
            deselectCard={props.deselectCard}
            editCard={props.editCard}
            hasEditMode={true}
            editor={props.editor}
        >
            <Image {...props}/>
        </Card>
    );
};

const ImageCard = createComponentCard({
    name: 'image',
    component: ImageCardComponent,
    koenigOptions: {
        hasEditMode: true,
        selectAfterInsert: true
    }
});

export default ImageCard;

import createComponentCard from '../../utils/create-component-card';
import Card from '../../components/Card';
import Image from './Image';
import ImageCardIcon from '../../icons/kg-card-type-image.svg';

const ImageCardComponent = ({...props}) => {
    return (
        <Card
            {...props}
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
        selectAfterInsert: true,
        cardMenu: {
            group: 'Primary',
            label: 'Image',
            desc: 'Upload, or embed with /image [url]',
            IconComponent: ImageCardIcon,
            iconClass: '',
            matches: ['image', 'img'],
            type: 'card',
            replaceArg: 'image',
            params: ['src'],
            payload: {
                triggerBrowse: true
            }
        }
    }
});

export default ImageCard;

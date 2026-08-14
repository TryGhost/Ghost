import {Text} from '@tryghost/shade/primitives';

const CustomHeader: React.FC<{
    children?: React.ReactNode;
}> = ({children}) => {
    return (
        <Text as='h4' className='md:text-xl' leading='heading' size='lg' weight='bold'>{children}</Text>
    );
};

export default CustomHeader;

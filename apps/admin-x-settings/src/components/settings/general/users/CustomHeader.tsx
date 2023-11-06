import Heading from '@tryghost/admin-x-design/global/Heading';

const CustomHeader: React.FC<{
    children?: React.ReactNode;
}> = ({children}) => {
    return (
        <Heading level={4}>{children}</Heading>
    );
};

export default CustomHeader;

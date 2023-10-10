import Heading from '../../../../admin-x-ds/global/Heading';

const CustomHeader: React.FC<{
    children?: React.ReactNode;
}> = ({children}) => {
    return (
        <Heading level={4}>{children}</Heading>
    );
};

export default CustomHeader;

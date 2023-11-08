import {SettingSection, SettingSectionProps} from '@tryghost/admin-x-design';
import {useSearch} from './providers/ServiceProvider';

const SearchableSection: React.FC<Omit<SettingSectionProps, 'isVisible'> & {keywords: string[]}> = ({keywords, ...props}) => {
    const {checkVisible} = useSearch();

    return (
        <SettingSection isVisible={checkVisible(keywords)} {...props} />
    );
};

export default SearchableSection;

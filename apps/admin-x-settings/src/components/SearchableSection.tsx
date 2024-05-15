import {SettingSection, SettingSectionProps} from '@tryghost/admin-x-design-system';
import {useSearch} from './providers/SettingsAppProvider';

const SearchableSection: React.FC<Omit<SettingSectionProps, 'isVisible'> & {keywords: string[]}> = ({keywords, ...props}) => {
    const {checkVisible, noResult} = useSearch();

    return (
        <SettingSection isVisible={checkVisible(keywords) || noResult} {...props} />
    );
};

export default SearchableSection;

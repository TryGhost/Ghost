import {LucideIcon} from '@tryghost/shade/utils';
import type {MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';

const icons: Record<MemberCustomField['type'], typeof LucideIcon.Type> = {
    short_text: LucideIcon.Type,
    long_text: LucideIcon.AlignLeft,
    address: LucideIcon.MapPin
};

const CustomFieldIcon: React.FC<{type: MemberCustomField['type']; className?: string}> = ({type, className}) => {
    const Icon = icons[type] || LucideIcon.Type;
    return <Icon className={className} />;
};

export default CustomFieldIcon;

import { userTypeForFieldType } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

const CustomFieldIcon: React.FC<{ type: MemberCustomField['type']; className?: string }> = ({
  type,
  className,
}) => {
  const Icon = userTypeForFieldType(type).icon;
  return <Icon className={className} />;
};

export default CustomFieldIcon;

import {ButtonGroup, type ButtonGroupProps} from '@tryghost/admin-x-design-system';

type ButtonGroupRowFieldProps = {
    label: string;
    activeKey: string;
    buttons: ButtonGroupProps['buttons'];
};

export const ButtonGroupRowField: React.FC<ButtonGroupRowFieldProps> = ({label, activeKey, buttons}) => {
    return (
        <div className='flex w-full justify-between'>
            <div>{label}</div>
            <ButtonGroup activeKey={activeKey} buttons={buttons} clearBg={false} />
        </div>
    );
};

import {ColorPickerField} from '@tryghost/admin-x-design-system';

type HeaderBackgroundColorFieldProps = {
    value: string;
    onChange: (value: string) => void;
};

export const HeaderBackgroundColorField: React.FC<HeaderBackgroundColorFieldProps> = ({value, onChange}) => {
    return (
        <ColorPickerField
            direction='rtl'
            eyedropper={true}
            swatches={[
                {
                    hex: '#00000000',
                    value: 'transparent',
                    title: 'Transparent'
                }
            ]}
            title='Header background color'
            value={value}
            onChange={(newColor) => {
                onChange(newColor || 'transparent');
            }}
        />
    );
};

import {ColorPickerField} from '@tryghost/admin-x-design-system';

type BackgroundColorFieldProps = {
    value: string;
    onChange: (value: string) => void;
};

export const BackgroundColorField: React.FC<BackgroundColorFieldProps> = ({value, onChange}) => {
    return (
        <ColorPickerField
            direction='rtl'
            eyedropper={true}
            swatches={[
                {
                    hex: '#ffffff',
                    value: 'light',
                    title: 'White'
                }
            ]}
            title='Background color'
            value={value}
            onChange={(newColor) => {
                onChange(newColor || 'light');
            }}
        />
    );
};

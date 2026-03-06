import {ColorPickerField} from '@tryghost/admin-x-design-system';

type ColorSwatch = {
    hex: string;
    value: string | null;
    title: string;
};

type ColorPickerRowFieldProps = {
    title: string;
    value: string | null;
    swatches: ColorSwatch[];
    onChange: (value: string | null) => void;
};

export const ColorPickerRowField: React.FC<ColorPickerRowFieldProps> = ({title, value, swatches, onChange}) => {
    return (
        <ColorPickerField
            direction='rtl'
            eyedropper={true}
            swatches={swatches}
            title={title}
            value={value || undefined}
            onChange={(newColor) => {
                onChange(newColor ?? null);
            }}
        />
    );
};

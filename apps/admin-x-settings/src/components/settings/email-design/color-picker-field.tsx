import {SemanticColorPickerField, type SemanticColorPickerSwatch} from '@tryghost/shade/patterns';

interface ColorPickerFieldProps {
    title: string;
    value: string | null;
    onChange: (color: string | null) => void;
    accentColor?: string;
    swatches?: SemanticColorPickerSwatch[];
}

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({title, value, onChange, accentColor, swatches = []}) => (
    <SemanticColorPickerField
        accentColor={accentColor}
        direction="rtl"
        swatches={swatches}
        title={title}
        value={value}
        onChange={onChange}
    />
);

export default ColorPickerField;

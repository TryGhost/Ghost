export function TextInput({value, onChange, controlled = false, ...args}) {
    const handleOnChange = (e) => {
        onChange(e);
    };

    return (
        <input
            {...(controlled ? {value} : {defaultValue: value})}
            onChange={handleOnChange}
            {...args}
        />
    );
}

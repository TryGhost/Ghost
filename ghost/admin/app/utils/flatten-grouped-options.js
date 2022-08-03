export default function flattenGroupedOptions(options) {
    const flatOptions = [];

    function getOptions(option) {
        if (option.options) {
            return option.options.forEach(getOptions);
        }

        flatOptions.push(option);
    }

    options.forEach(getOptions);

    return flatOptions;
}

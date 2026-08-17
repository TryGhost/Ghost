interface OperatorOption {
    value: string;
    label: string;
}

interface CreateOperatorOptionsOptions {
    labels?: Record<string, string>;
}

export function createOperatorOptions(
    operators: readonly string[],
    options: CreateOperatorOptionsOptions = {}
): OperatorOption[] {
    const labels = options.labels || {};

    return operators.map(operator => ({
        value: operator,
        label: labels[operator] ?? operator.replaceAll('-', ' ')
    }));
}

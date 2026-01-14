import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {Button} from './button';
import {AnimatedNumber} from './animated-number';

const meta = {
    title: 'Components / Animated number',
    component: AnimatedNumber,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Animated numeric transitions using `@number-flow/react`. Pass any `Intl.NumberFormat` options via the `format` prop.'
            }
        }
    }
} satisfies Meta<typeof AnimatedNumber>;

export default meta;
type Story = StoryObj<typeof AnimatedNumber>;

export const Default: Story = {
    render: () => {
        const InteractiveExample = () => {
            const [count, setCount] = useState(0);

            return (
                <div className="flex flex-col gap-4">
                    <AnimatedNumber value={count} />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => setCount(count + 1)}>
                            +1
                        </Button>
                        <Button size="sm" onClick={() => setCount(count + 10)}>
                            +10
                        </Button>
                        <Button size="sm" onClick={() => setCount(count + 100)}>
                            +100
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setCount(0)}>
                            Reset
                        </Button>
                    </div>
                </div>
            );
        };

        return <InteractiveExample />;
    }
};

export const WithFormatting: Story = {
    render: () => {
        const FormattingExample = () => {
            const [value, setValue] = useState(1234567.89);
            const values = [1234567.89, 2500000.50, 999.99, 150000.75];

            return (
                <div className="flex flex-col gap-4">
                    <AnimatedNumber
                        format={{
                            style: 'currency',
                            currency: 'USD'
                        }}
                        value={value}
                    />
                    <div className="flex gap-2">
                        {values.map(val => (
                            <Button key={val} size="sm" onClick={() => setValue(val)}>
                                ${val.toLocaleString()}
                            </Button>
                        ))}
                    </div>
                </div>
            );
        };

        return <FormattingExample />;
    }
};

export const Percentage: Story = {
    render: () => {
        const PercentageExample = () => {
            const [value, setValue] = useState(0.1234);
            const values = [0.1234, 0.456, 0.789, 0.025];

            return (
                <div className="flex flex-col gap-4">
                    <AnimatedNumber
                        format={{
                            style: 'percent',
                            minimumFractionDigits: 2
                        }}
                        value={value}
                    />
                    <div className="flex gap-2">
                        {values.map(val => (
                            <Button key={val} size="sm" onClick={() => setValue(val)}>
                                {(val * 100).toFixed(1)}%
                            </Button>
                        ))}
                    </div>
                </div>
            );
        };

        return <PercentageExample />;
    }
};

export const CompactNotation: Story = {
    render: () => {
        const CompactExample = () => {
            const [value, setValue] = useState(1234567);
            const values = [1234567, 5400000, 12000000, 850000];

            return (
                <div className="flex flex-col gap-4">
                    <AnimatedNumber
                        format={{
                            notation: 'compact',
                            compactDisplay: 'short',
                            roundingMode: 'trunc'
                        }}
                        value={value}
                        willChange
                    />
                    <div className="flex gap-2">
                        {values.map(val => (
                            <Button key={val} size="sm" onClick={() => setValue(val)}>
                                {(val / 1000000).toFixed(1)}M
                            </Button>
                        ))}
                    </div>
                </div>
            );
        };

        return <CompactExample />;
    }
};

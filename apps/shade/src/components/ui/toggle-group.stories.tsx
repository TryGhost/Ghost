import type {Meta, StoryObj} from '@storybook/react';
import {useState} from 'react';
import {ToggleGroup, ToggleGroupItem} from './toggle-group';
import {Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Square, RectangleVertical} from 'lucide-react';

const meta = {
    title: 'Components / Toggle group',
    component: ToggleGroup,
    tags: ['autodocs'],
    argTypes: {
        type: {
            control: false,
            table: {
                defaultValue: {summary: 'single'}
            }
        }
    }
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof ToggleGroup>;

const TextFormattingComponent = () => {
    const [value, setValue] = useState<string>('bold');

    return (
        <ToggleGroup type="single" value={value} onValueChange={(newValue) => {
            if (newValue) {
                setValue(newValue);
            }
        }}>
            <ToggleGroupItem aria-label="Bold" value="bold">
                <Bold className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Italic" value="italic">
                <Italic className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Underline" value="underline">
                <Underline className="size-4" />
            </ToggleGroupItem>
        </ToggleGroup>
    );
};

export const TextFormatting: Story = {
    render: () => <TextFormattingComponent />
};

const TextAlignmentComponent = () => {
    const [value, setValue] = useState<string>('left');

    return (
        <ToggleGroup type="single" value={value} onValueChange={(newValue) => {
            if (newValue) {
                setValue(newValue);
            }
        }}>
            <ToggleGroupItem aria-label="Align left" value="left">
                <AlignLeft className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Align center" value="center">
                <AlignCenter className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Align right" value="right">
                <AlignRight className="size-4" />
            </ToggleGroupItem>
        </ToggleGroup>
    );
};

export const TextAlignment: Story = {
    render: () => <TextAlignmentComponent />
};

const ViewModeComponent = () => {
    const [value, setValue] = useState<string>('vertical');

    return (
        <ToggleGroup type="single" value={value} onValueChange={(newValue) => {
            if (newValue) {
                setValue(newValue);
            }
        }}>
            <ToggleGroupItem aria-label="Vertical view" value="vertical">
                <RectangleVertical className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Square view" value="square">
                <Square className="size-4" />
            </ToggleGroupItem>
        </ToggleGroup>
    );
};

export const ViewMode: Story = {
    render: () => <ViewModeComponent />
};

const WithTextComponent = () => {
    const [value, setValue] = useState<string>('preview');

    return (
        <ToggleGroup type="single" value={value} onValueChange={(newValue) => {
            if (newValue) {
                setValue(newValue);
            }
        }}>
            <ToggleGroupItem aria-label="Preview" value="preview">
                Preview
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Code" value="code">
                Code
            </ToggleGroupItem>
        </ToggleGroup>
    );
};

export const WithText: Story = {
    render: () => <WithTextComponent />
};

const NoSelectionComponent = () => {
    const [value, setValue] = useState<string>('');

    return (
        <ToggleGroup type="single" value={value} onValueChange={setValue}>
            <ToggleGroupItem aria-label="Option 1" value="option1">
                Option 1
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Option 2" value="option2">
                Option 2
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Option 3" value="option3">
                Option 3
            </ToggleGroupItem>
        </ToggleGroup>
    );
};

export const NoSelection: Story = {
    render: () => <NoSelectionComponent />
};
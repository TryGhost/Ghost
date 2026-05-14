import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {Calendar} from './calendar';
import {Popover, PopoverContent, PopoverTrigger} from './popover';
import {Button} from './button';

const meta = {
    title: 'Components / Calendar',
    component: Calendar,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component:
                    'Date picker calendar built on react-day-picker. Pair with a Popover to compose a date input control.'
            }
        }
    }
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof Calendar>;

const SingleCalendarExample = () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return (
        <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
        />
    );
};

const DatePickerExample = () => {
    const [date, setDate] = useState<Date | undefined>(undefined);
    return (
        <div style={{minHeight: 360}}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline">
                        {date ? date.toLocaleDateString() : 'Pick a date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} />
                </PopoverContent>
            </Popover>
        </div>
    );
};

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Inline single-date selection.'
            }
        }
    },
    render: () => <SingleCalendarExample />
};

export const DatePicker: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Calendar inside a Popover, the typical date-picker composition.'
            }
        }
    },
    render: () => <DatePickerExample />
};

import {DropdownMenu, DropdownMenuContent, DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {Tabs, TabsDropdownTrigger, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {ChevronDown} from 'lucide-react';
import React from 'react';

// Generic tab container - no business logic
interface TableFilterTabsProps {
    className?: string;
    selectedTab: string;
    onTabChange: (tab: string) => void;
    children: React.ReactNode;
    defaultValue?: string;
}

const TableFilterTabs: React.FC<TableFilterTabsProps> = ({
    className,
    selectedTab,
    onTabChange,
    children,
    defaultValue
}) => {
    return (
        <Tabs
            className={className}
            defaultValue={defaultValue}
            value={selectedTab}
            variant='button-sm'
            onValueChange={onTabChange}
        >
            <TabsList>
                {children}
            </TabsList>
        </Tabs>
    );
};

// Simple tab component
interface TableFilterTabProps {
    value: string;
    children: React.ReactNode;
}

const TableFilterTab: React.FC<TableFilterTabProps> = ({
    value,
    children
}) => {
    return <TabsTrigger value={value}>{children}</TabsTrigger>;
};

// Generic dropdown tab for any options
interface TableFilterDropdownTabProps {
    value: string;
    options: Array<{ value: string; label: string }>;
    selectedOption: string;
    onOptionChange: (option: string) => void;
    placeholder?: string;
}

const TableFilterDropdownTab: React.FC<TableFilterDropdownTabProps> = ({
    value,
    options,
    selectedOption,
    onOptionChange,
    placeholder = 'Select...'
}) => {
    const displayText = options.find(opt => opt.value === selectedOption)?.label || placeholder;

    return (
        <DropdownMenu>
            <TabsDropdownTrigger
                className="flex items-center gap-2"
                value={value}
            >
                {displayText} <ChevronDown className="size-4" />
            </TabsDropdownTrigger>
            <DropdownMenuContent>
                {options.map(option => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => onOptionChange(option.value)}
                    >
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export {
    TableFilterTab,
    TableFilterDropdownTab,
    TableFilterTabs
};

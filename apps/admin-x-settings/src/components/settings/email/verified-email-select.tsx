import './verified-emails-modal'; // Side-effect import to register the modal with NiceModal
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {
    Badge,
    Button,
    Command,
    CommandCheck,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@tryghost/shade';
import {showToast} from '@tryghost/admin-x-design-system';
import {useAddVerifiedEmail, useBrowseVerifiedEmails} from '@tryghost/admin-x-framework/api/verified-emails';

export interface SpecialOption {
    value: string;
    label: string;
}

export interface VerifiedEmailSelectProps {
    value: string;
    onChange: (value: string) => void;
    specialOptions?: SpecialOption[];
    context?: {
        type: 'newsletter' | 'setting' | 'automated_email';
        id?: string;
        property?: string;
        key?: string;
    };
    title?: string;
    placeholder?: string;
}

const VerifiedEmailSelect: React.FC<VerifiedEmailSelectProps> = ({
    value,
    onChange,
    specialOptions,
    context,
    title,
    placeholder = 'Select email address...'
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const {data: {verified_emails: verifiedEmails = []} = {}} = useBrowseVerifiedEmails();
    const {mutateAsync: addVerifiedEmail} = useAddVerifiedEmail();

    const verified = verifiedEmails.filter(e => e.status === 'verified');
    const pending = verifiedEmails.filter(e => e.status === 'pending');

    const searchTrimmed = search.trim();
    const exactMatchExists = verified.some(e => e.email.toLowerCase() === searchTrimmed.toLowerCase());
    const showAddOption = searchTrimmed.length > 0 && !exactMatchExists;

    const getDisplayLabel = () => {
        if (specialOptions) {
            const special = specialOptions.find(opt => opt.value === value);
            if (special) {
                return special.label;
            }
        }
        if (value) {
            return value;
        }
        return placeholder;
    };

    const handleAddEmail = async (email: string) => {
        const trimmed = email.trim();
        if (!trimmed) {
            return;
        }

        try {
            const result = await addVerifiedEmail({email: trimmed, context});
            const addedEmail = result?.verified_emails?.[0];
            if (addedEmail?.status === 'verified') {
                showToast({
                    type: 'success',
                    message: `${trimmed} is already verified`
                });
                onChange(trimmed);
            } else {
                showToast({
                    type: 'info',
                    message: `Verification email sent to ${trimmed}`
                });
            }
            setSearch('');
            setOpen(false);
        } catch {
            showToast({
                type: 'error',
                message: 'Failed to send verification email'
            });
        }
    };

    const handleOpenManageModal = () => {
        setOpen(false);
        NiceModal.show('verified-emails-modal');
    };

    return (
        <div>
            {title && <span className="mb-1 inline-block text-xs font-semibold text-grey-900 dark:text-grey-300">{title}</span>}
            <Popover open={open} onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) {
                    setSearch('');
                }
            }}>
                <PopoverTrigger asChild>
                    <Button
                        className="w-full justify-between"
                        role="combobox"
                        variant="dropdown"
                    >
                        <span className="truncate">{getDisplayLabel()}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0" side="bottom">
                    <Command>
                        <CommandInput
                            placeholder="Search or add email address..."
                            value={search}
                            onValueChange={setSearch}
                        />
                        <CommandList>
                            {!showAddOption && <CommandEmpty>No email addresses found.</CommandEmpty>}

                            {specialOptions && specialOptions.length > 0 && (
                                <>
                                    <CommandGroup>
                                        {specialOptions.map(option => (
                                            <CommandItem
                                                key={option.value}
                                                value={option.value}
                                                onSelect={() => {
                                                    onChange(option.value);
                                                    setOpen(false);
                                                }}
                                            >
                                                <span>{option.label}</span>
                                                {value === option.value && <CommandCheck />}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    <CommandSeparator />
                                </>
                            )}

                            {verified.length > 0 && (
                                <CommandGroup heading="Verified addresses">
                                    {verified.map(email => (
                                        <CommandItem
                                            key={email.id}
                                            value={email.email}
                                            onSelect={() => {
                                                onChange(email.email);
                                                setOpen(false);
                                            }}
                                        >
                                            <span>{email.email}</span>
                                            {value === email.email && <CommandCheck />}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {pending.length > 0 && (
                                <CommandGroup heading="Pending verification">
                                    {pending.map(email => (
                                        <CommandItem
                                            key={email.id}
                                            className="opacity-50"
                                            value={email.email}
                                            disabled
                                        >
                                            <span>{email.email}</span>
                                            <Badge className="ml-auto" variant="secondary">Pending</Badge>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {showAddOption && (
                                <>
                                    <CommandSeparator />
                                    <CommandGroup forceMount>
                                        <CommandItem
                                            value={`add-${searchTrimmed}`}
                                            forceMount
                                            onSelect={() => handleAddEmail(searchTrimmed)}
                                        >
                                            Add {searchTrimmed}
                                        </CommandItem>
                                    </CommandGroup>
                                </>
                            )}

                            <CommandSeparator />

                            <CommandGroup forceMount>
                                <CommandItem forceMount onSelect={handleOpenManageModal}>
                                    Manage verified emails...
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default VerifiedEmailSelect;

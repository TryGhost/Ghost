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
    placeholder?: string;
}

const VerifiedEmailSelect: React.FC<VerifiedEmailSelectProps> = ({
    value,
    onChange,
    specialOptions,
    context,
    placeholder = 'Select email address...'
}) => {
    const [open, setOpen] = useState(false);
    const [addMode, setAddMode] = useState(false);
    const [newEmail, setNewEmail] = useState('');

    const {data: {verified_emails: verifiedEmails = []} = {}} = useBrowseVerifiedEmails();
    const {mutateAsync: addVerifiedEmail} = useAddVerifiedEmail();

    const verified = verifiedEmails.filter(e => e.status === 'verified');
    const pending = verifiedEmails.filter(e => e.status === 'pending');

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

    const handleAddEmail = async () => {
        const email = newEmail.trim();
        if (!email) {
            return;
        }

        try {
            await addVerifiedEmail({email, context});
            showToast({
                type: 'info',
                message: `Verification email sent to ${email}`
            });
            setNewEmail('');
            setAddMode(false);
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
        <Popover open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
                setAddMode(false);
                setNewEmail('');
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
                    {addMode ? (
                        <>
                            <CommandInput
                                placeholder="Enter email address..."
                                value={newEmail}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddEmail();
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setAddMode(false);
                                        setNewEmail('');
                                    }
                                }}
                                onValueChange={setNewEmail}
                            />
                            <CommandList>
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={handleAddEmail}
                                    >
                                        Send verification email
                                    </CommandItem>
                                </CommandGroup>
                            </CommandList>
                        </>
                    ) : (
                        <>
                            <CommandInput placeholder="Search email addresses..." />
                            <CommandList>
                                <CommandEmpty>No email addresses found.</CommandEmpty>

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

                                <CommandSeparator />

                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => {
                                            setAddMode(true);
                                            setNewEmail('');
                                        }}
                                    >
                                        Add new email...
                                    </CommandItem>
                                    <CommandItem onSelect={handleOpenManageModal}>
                                        Manage verified emails...
                                    </CommandItem>
                                </CommandGroup>
                            </CommandList>
                        </>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default VerifiedEmailSelect;

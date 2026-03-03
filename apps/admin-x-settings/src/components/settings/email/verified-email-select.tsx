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
import {type InboxLinks, type VerifiedEmailContext, useAddVerifiedEmail, useBrowseVerifiedEmails} from '@tryghost/admin-x-framework/api/verified-emails';
import {showToast} from '@tryghost/admin-x-design-system';

const PROVIDER_LABELS: Record<string, string> = {
    gmail: 'Open Gmail',
    outlook: 'Open Outlook',
    yahoo: 'Open Yahoo Mail',
    proton: 'Open Proton Mail',
    icloud: 'Open iCloud Mail',
    hey: 'Open Hey',
    aol: 'Open AOL Mail',
    mailru: 'Open Mail.ru',
    'dev-mailpit': 'Open Mailpit'
};

export interface SpecialOption {
    value: string;
    label: string;
}

export interface VerifiedEmailSelectProps {
    value: string;
    onChange: (value: string) => void;
    specialOptions?: SpecialOption[];
    context?: VerifiedEmailContext;
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

    const getVerificationToastMessage = (email: string, inboxLinks?: InboxLinks | null) => {
        if (inboxLinks) {
            const label = PROVIDER_LABELS[inboxLinks.provider] || 'Open inbox';
            return (
                <span>
                    Verification email sent to {email}.{' '}
                    <a className="font-semibold text-black underline dark:text-white" href={inboxLinks.desktop} rel="noreferrer" target="_blank">{label}</a>
                </span>
            );
        }
        return `Verification email sent to ${email}`;
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
                const inboxLinks = result?.meta?.inbox_links;
                showToast({
                    type: 'info',
                    message: getVerificationToastMessage(trimmed, inboxLinks)
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
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0" side="bottom">
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

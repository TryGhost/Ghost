import Layout from '@src/components/layout';
import React, {useEffect, useRef, useState} from 'react';
import {Button, Field, FieldError, FieldLabel, Input, LoadingIndicator, Skeleton, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {H2, Inline} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {getHandleParts, validateSocialWebUsername} from '@utils/social-web-handle';
import {useAccountDomainForUser, useAccountForUser, useUpdateAccountDomainMutationForUser, useUpdateAccountMutationForUser, useValidateAccountDomainMutationForUser} from '@hooks/use-activity-pub-queries';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

function normalizeDomainInput(value: string) {
    const trimmed = value.trim();

    if (trimmed === '') {
        return null;
    }

    try {
        return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).host || null;
    } catch {
        return trimmed.replace(/^[a-z][a-z\d+\-.]*:\/\//i, '').split(/[/?#]/)[0] || null;
    }
}

function getDefaultDomain(actorUrl?: string, handle?: string) {
    if (actorUrl) {
        try {
            return new URL(actorUrl).host;
        } catch {
            // Fall through to handle parsing.
        }
    }

    return handle?.split('@').at(-1) ?? '';
}

function getImageUrl(url?: string | null, baseUrl?: string) {
    if (!url) {
        return '';
    }

    try {
        return new URL(url, baseUrl || window.location.origin).toString();
    } catch {
        return url;
    }
}

async function copyTextToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // Fall back for browser contexts where the async clipboard API is blocked.
        }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

const Domain: React.FC = () => {
    const {
        data: account,
        isLoading: isLoadingAccount
    } = useAccountForUser('index', 'me');
    const {data: siteData} = useBrowseSite();
    const {
        data: domainData,
        isLoading: isLoadingDomain,
        isError: hasDomainLoadError
    } = useAccountDomainForUser('index');
    const updateDomainMutation = useUpdateAccountDomainMutationForUser('index');
    const validateDomainMutation = useValidateAccountDomainMutationForUser('index');
    const updateAccountMutation = useUpdateAccountMutationForUser(account?.handle || 'index');
    const [domainInput, setDomainInput] = useState('');
    const [usernameInput, setUsernameInput] = useState('');
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [isEditingDomain, setIsEditingDomain] = useState(false);
    const [isAddingDomain, setIsAddingDomain] = useState(false);
    const [validatedDomain, setValidatedDomain] = useState<string | null>(null);
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [hasCopiedHandle, setHasCopiedHandle] = useState(false);
    const [isHandleTooltipOpen, setIsHandleTooltipOpen] = useState(false);
    const copyTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (account?.handle) {
            setUsernameInput(getHandleParts(account.handle).username);
            setUsernameError(null);
        }
    }, [account?.handle]);

    useEffect(() => () => {
        if (copyTimeoutRef.current) {
            window.clearTimeout(copyTimeoutRef.current);
        }
    }, []);

    const normalizedDomain = normalizeDomainInput(domainInput);
    const activeDomain = domainData?.domain ?? null;
    const defaultDomain = getDefaultDomain(domainData?.actorUrl, domainData?.handle);
    const currentUsername = getHandleParts(account?.handle).username;
    const isUpdatingAccount = updateAccountMutation.isPending;
    const isMutating = updateDomainMutation.isPending || validateDomainMutation.isPending;
    const isDisabled = isLoadingDomain || isMutating;
    const isUsernameDisabled = isLoadingAccount || isUpdatingAccount || !account;
    const canSaveUsername = Boolean(isEditingUsername && usernameInput !== currentUsername);
    const showInstructions = Boolean(isAddingDomain && normalizedDomain && (!activeDomain || validatedDomain === normalizedDomain));
    const canAdd = Boolean(isEditingDomain && normalizedDomain && !isAddingDomain);
    const canValidate = Boolean(showInstructions && normalizedDomain && normalizedDomain !== validatedDomain);
    const canSave = Boolean(validatedDomain && normalizedDomain === validatedDomain);
    const redirectSource = normalizedDomain ? `https://${normalizedDomain}/.well-known/webfinger` : '';
    const redirectTarget = defaultDomain ? `https://${defaultDomain}/.well-known/webfinger` : '';
    const handleParts = getHandleParts(domainData?.handle);
    const previewHandleParts = {
        username: isEditingUsername ? usernameInput : handleParts.username,
        domain: (isEditingDomain || isAddingDomain) && domainInput ? normalizedDomain ?? domainInput.trim() : handleParts.domain
    };
    const previewHandle = `@${previewHandleParts.username}@${previewHandleParts.domain}`;
    const profileImageUrl = getImageUrl(account?.avatarUrl || siteData?.site?.icon, siteData?.site?.url);

    const handleAdd = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formDomain = normalizeDomainInput(new FormData(event.currentTarget).get('domain')?.toString() ?? '');

        if (!formDomain) {
            return;
        }

        setDomainInput(formDomain);
        setIsEditingDomain(true);
        setIsAddingDomain(true);
        setFieldError(null);
        setValidationError(null);
    };

    const handleValidate = async () => {
        if (!normalizedDomain || !canValidate) {
            return;
        }

        setFieldError(null);
        setValidationError(null);

        try {
            await validateDomainMutation.mutateAsync(normalizedDomain);
            setValidatedDomain(normalizedDomain);
        } catch {
            setValidationError('Redirect could not be validated');
        }
    };

    const handleSave = async () => {
        if (!validatedDomain) {
            return;
        }

        setFieldError(null);
        setValidationError(null);

        try {
            await updateDomainMutation.mutateAsync(validatedDomain);
            setDomainInput('');
            setIsEditingDomain(false);
            setIsAddingDomain(false);
            setValidatedDomain(null);
        } catch {
            setFieldError('Could not save the custom domain. Try again.');
        }
    };

    const handleCancel = () => {
        setDomainInput('');
        setIsEditingDomain(false);
        setIsAddingDomain(false);
        setValidatedDomain(null);
        setFieldError(null);
        setValidationError(null);
    };

    const handleSaveUsername = async () => {
        if (!account || !isEditingUsername || !canSaveUsername) {
            return;
        }

        const validationMessage = validateSocialWebUsername(usernameInput);
        if (validationMessage) {
            setUsernameError(validationMessage);
            return;
        }

        setUsernameError(null);

        try {
            await updateAccountMutation.mutateAsync({
                name: account.name,
                username: usernameInput,
                bio: account.bio ?? '',
                avatarUrl: account.avatarUrl || '',
                bannerImageUrl: account.bannerImageUrl || ''
            });
            setIsEditingUsername(false);
        } catch {
            setUsernameError('Could not save the Social Web username. Try again.');
        }
    };

    const handleCancelUsername = () => {
        setUsernameInput(currentUsername);
        setUsernameError(null);
        setIsEditingUsername(false);
    };

    const handleRemove = async () => {
        setFieldError(null);

        try {
            await updateDomainMutation.mutateAsync(null);
            setDomainInput('');
            setIsEditingDomain(false);
            setIsAddingDomain(false);
            setValidatedDomain(null);
        } catch {
            setFieldError('Could not remove the custom domain. Try again.');
        }
    };

    const handleCopySocialWebHandle = async () => {
        if (!previewHandleParts.username || !previewHandleParts.domain) {
            return;
        }

        await copyTextToClipboard(previewHandle);

        setHasCopiedHandle(true);
        setIsHandleTooltipOpen(true);

        if (copyTimeoutRef.current) {
            window.clearTimeout(copyTimeoutRef.current);
        }

        copyTimeoutRef.current = window.setTimeout(() => {
            setHasCopiedHandle(false);
            setIsHandleTooltipOpen(false);
        }, 2000);
    };

    return (
        <Layout>
            <div className='mx-auto max-w-[620px] py-[min(4vh,48px)]'>
                <Inline gap='2xl' justify='between'>
                    <H2>Your social web handle</H2>
                </Inline>

                <p className='mt-3 text-base text-muted-foreground'>
                    Like an email address, your handle is how people can find and interact with you.
                </p>

                <div className='mt-10'>
                    <div className='rounded-md border border-border-default bg-sidebar px-4 pt-3 pb-4'>
                        <Field>
                            {isLoadingDomain ? (
                                <Skeleton className='mt-2 h-16 w-full' />
                            ) : hasDomainLoadError ? (
                                <p className='text-sm text-muted-foreground'>Could not load your Social Web handle.</p>
                            ) : (
                                <div className='mt-3 flex items-start gap-2'>
                                    <div className='mt-[-5px] flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-elevated text-muted-foreground ring-1 ring-border-default'>
                                        {isLoadingAccount ? (
                                            <Skeleton className='size-7 rounded-full' />
                                        ) : profileImageUrl ? (
                                            <img
                                                alt={account?.name || siteData?.site?.title || ''}
                                                className='size-full rounded-full object-cover'
                                                referrerPolicy='no-referrer'
                                                src={profileImageUrl}
                                            />
                                        ) : (
                                            <LucideIcon.UserRound className='size-4' strokeWidth={1.5} />
                                        )}
                                    </div>
                                    <div className='-ml-14 min-w-0 overflow-x-auto px-14'>
                                        <div aria-label='Social Web handle breakdown' className='inline-flex pb-9 font-mono text-xl leading-none font-medium whitespace-nowrap text-foreground select-none' role='group'>
                                            <span>@</span>
                                            <div className='relative'>
                                                <span>{previewHandleParts.username}</span>
                                                <div className='absolute top-7 left-0 w-full border-t border-border-strong before:absolute before:top-[-5px] before:left-0 before:h-[5px] before:border-l before:border-border-strong after:absolute after:top-[-5px] after:right-0 after:h-[5px] after:border-l after:border-border-strong'>
                                                    <span aria-hidden='true' className='absolute top-0 left-1/2 h-[5px] border-l border-border-strong' />
                                                    <div className='absolute top-2 right-0 w-max min-w-full text-center font-sans text-[10px] leading-normal font-medium whitespace-nowrap text-muted-foreground uppercase'>
                                                        Username
                                                    </div>
                                                </div>
                                            </div>
                                            <span className='ml-px'>@</span>
                                            <div className='relative'>
                                                <span>{previewHandleParts.domain}</span>
                                                <div className='absolute top-7 left-0 w-full border-t border-state-success before:absolute before:top-[-5px] before:left-0 before:h-[5px] before:border-l before:border-state-success after:absolute after:top-[-5px] after:right-0 after:h-[5px] after:border-l after:border-state-success'>
                                                    <span aria-hidden='true' className='absolute top-0 left-1/2 h-[5px] border-l border-state-success' />
                                                    <div className='absolute top-2 left-0 w-max min-w-full text-center font-sans text-[10px] leading-normal font-medium whitespace-nowrap text-state-success uppercase'>
                                                        Domain
                                                    </div>
                                                </div>
                                            </div>
                                            {domainData?.handle && (
                                                <TooltipProvider delayDuration={0}>
                                                    <Tooltip open={isHandleTooltipOpen} onOpenChange={setIsHandleTooltipOpen}>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                aria-label='Copy Social Web handle'
                                                                className='mt-[-2px] ml-1.5 size-5 shrink-0 self-start p-0 text-muted-foreground hover:text-foreground [&_svg]:size-3.5!'
                                                                type='button'
                                                                variant='ghost'
                                                                onClick={() => {
                                                                    void handleCopySocialWebHandle();
                                                                }}
                                                            >
                                                                <LucideIcon.Copy size={12} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{hasCopiedHandle ? 'Copied!' : 'Copy'}</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Field>
                    </div>
                </div>

                <form
                    className='mt-10'
                    onSubmit={(event) => {
                        event.preventDefault();
                        void handleSaveUsername();
                    }}
                >
                    <Field>
                        <FieldLabel htmlFor='social-web-username'>Social web username</FieldLabel>
                        {isLoadingAccount ? (
                            <Skeleton className='h-9 w-full' />
                        ) : (
                            <Inline className='flex-col items-stretch sm:flex-row sm:items-center' gap='md'>
                                <Input
                                    aria-describedby={usernameError ? 'social-web-username-error' : undefined}
                                    aria-invalid={usernameError ? true : undefined}
                                    autoComplete='off'
                                    className='sm:flex-1'
                                    disabled={isUsernameDisabled || !isEditingUsername}
                                    id='social-web-username'
                                    value={usernameInput}
                                    data-1p-ignore
                                    onChange={(event) => {
                                        setUsernameInput(event.target.value);
                                        setUsernameError(null);
                                    }}
                                />
                                {isEditingUsername ? (
                                    <Inline gap='md' justify='end'>
                                        <Button className='h-9 text-sm sm:w-auto' disabled={isUpdatingAccount} type='button' variant='outline' onClick={handleCancelUsername}>
                                            Cancel
                                        </Button>
                                        <Button className='h-9 text-sm sm:w-auto' disabled={isUsernameDisabled || !canSaveUsername} type='submit'>
                                            {isUpdatingAccount ? (
                                                <>
                                                    <LoadingIndicator color='light' size='sm' />
                                                    Saving...
                                                </>
                                            ) : 'Save'}
                                        </Button>
                                    </Inline>
                                ) : (
                                    <Button
                                        aria-label='Edit Social web username'
                                        className='h-9 text-sm sm:w-auto'
                                        disabled={isUsernameDisabled}
                                        type='button'
                                        variant='outline'
                                        onClick={() => {
                                            setUsernameInput(currentUsername);
                                            setUsernameError(null);
                                            setIsEditingUsername(true);
                                        }}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </Inline>
                        )}
                        {usernameError && (
                            <FieldError id='social-web-username-error'>{usernameError}</FieldError>
                        )}
                    </Field>
                </form>

                <div className='mt-10'>
                    {activeDomain && !validatedDomain ? (
                        <Field data-invalid={fieldError ? true : undefined}>
                            <FieldLabel htmlFor='social-web-active-domain'>Social web domain</FieldLabel>
                            <Inline className='flex-col items-stretch sm:flex-row sm:items-center' gap='md'>
                                <Input
                                    aria-label='Active social web domain'
                                    autoComplete='off'
                                    className='sm:flex-1'
                                    id='social-web-active-domain'
                                    value={activeDomain}
                                    data-1p-ignore
                                    disabled
                                />
                                <Button className='h-9 text-sm sm:w-auto' disabled={isDisabled} variant='outline' onClick={handleRemove}>
                                    {updateDomainMutation.isPending ? (
                                        <>
                                            <LoadingIndicator size='sm' />
                                            Removing...
                                        </>
                                    ) : 'Remove'}
                                </Button>
                            </Inline>
                            {fieldError && (
                                <FieldError id='social-web-domain-error'>{fieldError}</FieldError>
                            )}
                        </Field>
                    ) : (
                        <form onSubmit={handleAdd}>
                            <Field data-invalid={fieldError ? true : undefined}>
                                <FieldLabel htmlFor='social-web-domain'>Social web domain</FieldLabel>
                                <Inline className='flex-col items-stretch sm:flex-row sm:items-center' gap='md'>
                                    <Input
                                        aria-describedby={fieldError ? 'social-web-domain-error' : undefined}
                                        aria-invalid={fieldError ? true : undefined}
                                        aria-label='Social web domain'
                                        autoComplete='off'
                                        className='sm:flex-1'
                                        disabled={isDisabled || !isEditingDomain || isAddingDomain}
                                        id='social-web-domain'
                                        name='domain'
                                        placeholder={defaultDomain}
                                        value={isEditingDomain || isAddingDomain ? domainInput : defaultDomain}
                                        data-1p-ignore
                                        onChange={(event) => {
                                            setDomainInput(event.target.value);
                                            setIsAddingDomain(false);
                                            setValidatedDomain(null);
                                            setFieldError(null);
                                            setValidationError(null);
                                        }}
                                    />
                                    {!showInstructions && (
                                        isEditingDomain ? (
                                            <Inline gap='md' justify='end'>
                                                <Button className='h-9 text-sm sm:w-auto' disabled={isDisabled} type='button' variant='outline' onClick={handleCancel}>
                                                    Cancel
                                                </Button>
                                                <Button className='h-9 text-sm sm:w-auto' disabled={isDisabled || !canAdd || hasDomainLoadError} type='submit'>
                                                    Activate
                                                </Button>
                                            </Inline>
                                        ) : (
                                            <Button
                                                aria-label='Edit Social web domain'
                                                className='h-9 text-sm sm:w-auto'
                                                disabled={isDisabled || hasDomainLoadError}
                                                type='button'
                                                variant='outline'
                                                onClick={() => {
                                                    setDomainInput('');
                                                    setFieldError(null);
                                                    setValidationError(null);
                                                    setIsEditingDomain(true);
                                                }}
                                            >
                                                Edit
                                            </Button>
                                        )
                                    )}
                                </Inline>
                                {fieldError && (
                                    <FieldError id='social-web-domain-error'>{fieldError}</FieldError>
                                )}
                            </Field>

                            {showInstructions && (
                                <div className='mt-6 rounded-md border border-border-default bg-surface-elevated p-4'>
                                    <div className='text-sm font-medium text-foreground'>Set up your redirect</div>
                                    <p className='mt-2 text-sm text-muted-foreground'>
                                        Add a redirect or proxy service to forward social web requests to Ghost.
                                    </p>
                                    <div className='mt-4 flex flex-col gap-3 text-sm'>
                                        <div>
                                            <div className='text-muted-foreground'>Redirect from</div>
                                            <code className='mt-1 block overflow-x-auto rounded-sm bg-background px-3 py-2 text-foreground'>{redirectSource}</code>
                                        </div>
                                        <div>
                                            <div className='text-muted-foreground'>Redirect to</div>
                                            <code className='mt-1 block overflow-x-auto rounded-sm bg-background px-3 py-2 text-foreground'>{redirectTarget}</code>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showInstructions && (
                                <Inline className='mt-4 flex-col items-stretch sm:flex-row sm:items-center' gap='md' justify='between'>
                                    <div className='text-sm text-destructive'>
                                        {validationError}
                                    </div>
                                    <Inline gap='md' justify='end'>
                                        <Button disabled={isDisabled} variant='outline' onClick={handleCancel}>Cancel</Button>
                                        {canSave ? (
                                            <Button disabled={isDisabled} onClick={handleSave}>
                                                {updateDomainMutation.isPending ? (
                                                    <>
                                                        <LoadingIndicator color='light' size='sm' />
                                                        Saving...
                                                    </>
                                                ) : 'Save'}
                                            </Button>
                                        ) : (
                                            <Button disabled={isDisabled || !canValidate || hasDomainLoadError} onClick={handleValidate}>
                                                {validateDomainMutation.isPending ? (
                                                    <>
                                                        <LoadingIndicator color='light' size='sm' />
                                                        Validating...
                                                    </>
                                                ) : validationError ? 'Retry' : 'Validate'}
                                            </Button>
                                        )}
                                    </Inline>
                                </Inline>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Domain;

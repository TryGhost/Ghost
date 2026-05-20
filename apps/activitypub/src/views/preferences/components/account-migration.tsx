import Layout from '@src/components/layout';
import React, {useState} from 'react';
import {Button, Field, FieldDescription, FieldError, FieldLabel, Input, LoadingIndicator, Skeleton} from '@tryghost/shade/components';
import {H2} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {useAccountAliasesForUser, useAddAccountAliasMutationForUser, useRemoveAccountAliasMutationForUser} from '@hooks/use-activity-pub-queries';

const HANDLE_REGEX = /^@?[^@\s]+@[^@\s]+$/;

function normalizeHandle(handle: string) {
    const trimmedHandle = handle.trim();

    return trimmedHandle.startsWith('@') ? trimmedHandle : `@${trimmedHandle}`;
}

function getAliasDisplayHandle(actorUri: string) {
    try {
        const url = new URL(actorUri);
        const mastodonUserMatch = url.pathname.match(/^\/users\/([^/]+)\/?$/);

        if (mastodonUserMatch) {
            return `${decodeURIComponent(mastodonUserMatch[1])}@${url.hostname}`;
        }

        return `${url.hostname}${url.pathname}`;
    } catch {
        return actorUri;
    }
}

function getAliasErrorMessage(error: unknown) {
    if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        typeof error.statusCode === 'number'
    ) {
        if (error.statusCode === 400) {
            return 'Enter a valid handle, like old@mastodon.social.';
        }

        if (error.statusCode === 404) {
            return 'Could not find that profile. Check the handle and try again.';
        }
    }

    return 'Something went wrong, please try again.';
}

const AccountMigration: React.FC = () => {
    const {
        data: aliasData,
        isError: hasAliasLoadError,
        isLoading: isLoadingAliases,
        refetch: refetchAliases
    } = useAccountAliasesForUser('index');
    const addAliasMutation = useAddAccountAliasMutationForUser('index');
    const removeAliasMutation = useRemoveAccountAliasMutationForUser('index');
    const [sourceHandle, setSourceHandle] = useState('');
    const [handleError, setHandleError] = useState<string | null>(null);
    const [aliasActionError, setAliasActionError] = useState<string | null>(null);
    const [removingAlias, setRemovingAlias] = useState<string | null>(null);

    const aliases = [...(aliasData?.aliases ?? [])].reverse();
    const showAliasesSection = isLoadingAliases || hasAliasLoadError || aliases.length > 0;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedHandle = sourceHandle.trim();

        if (!HANDLE_REGEX.test(trimmedHandle)) {
            setHandleError('Enter a valid handle, like old@mastodon.social.');
            return;
        }

        setHandleError(null);
        setAliasActionError(null);

        try {
            const normalizedHandle = normalizeHandle(trimmedHandle);
            await addAliasMutation.mutateAsync(normalizedHandle);
            setSourceHandle('');
        } catch (error) {
            setHandleError(getAliasErrorMessage(error));
        }
    };

    const handleRemoveAlias = async (actorUri: string) => {
        setAliasActionError(null);
        setRemovingAlias(actorUri);

        try {
            await removeAliasMutation.mutateAsync(actorUri);
        } catch {
            setAliasActionError('Could not remove migration profile.');
        } finally {
            setRemovingAlias(null);
        }
    };

    return (
        <Layout>
            <div className='mx-auto max-w-[620px] py-[min(4vh,48px)]'>
                <div className='flex items-center justify-between gap-8'>
                    <H2>Account migration</H2>
                </div>

                <div className='mt-3 text-base text-gray-800 dark:text-gray-600'>
                    <p>
                        You can move your followers from another social web account (eg. <a className='underline hover:text-black dark:hover:text-white' href='https://docs.joinmastodon.org/user/moving/#move' rel='noopener noreferrer' target='_blank'>Mastodon</a>) to this one by creating an account alias. This action is harmless and reversible. The account migration is initiated from the old account.
                    </p>
                </div>

                <form className='mt-10' onSubmit={handleSubmit}>
                    <Field data-invalid={handleError ? true : undefined}>
                        <FieldLabel htmlFor='account-migration-source-handle'>
                            Old account handle
                        </FieldLabel>
                        <FieldDescription className='-mt-1' id='account-migration-source-handle-description'>
                            Specify the username@domain of the account you want to move from
                        </FieldDescription>
                        <div className='flex flex-col gap-3 sm:flex-row'>
                            <Input
                                aria-describedby={handleError ? 'account-migration-source-handle-error' : 'account-migration-source-handle-description'}
                                aria-invalid={handleError ? true : undefined}
                                autoComplete='off'
                                className='sm:flex-1'
                                id='account-migration-source-handle'
                                placeholder='username@domain'
                                value={sourceHandle}
                                data-1p-ignore
                                onChange={event => setSourceHandle(event.target.value)}
                            />
                            <Button className='relative h-9 text-sm sm:w-auto' disabled={addAliasMutation.isLoading} type='submit'>
                                <span className={addAliasMutation.isLoading ? 'invisible' : undefined}>Create alias</span>
                                {addAliasMutation.isLoading && (
                                    <span className='absolute inset-0 flex items-center justify-center'>
                                        <LoadingIndicator color='light' size='sm' />
                                        <span className='sr-only'>Creating alias...</span>
                                    </span>
                                )}
                            </Button>
                        </div>
                        {handleError && (
                            <FieldError id='account-migration-source-handle-error'>
                                {handleError}
                            </FieldError>
                        )}
                        {aliasActionError && (
                            <FieldError id='account-migration-alias-error'>
                                {aliasActionError}
                            </FieldError>
                        )}
                    </Field>
                </form>

                {showAliasesSection && (
                    <div className='mt-10' data-testid='account-migration-aliases'>
                        <div className='pb-3'>
                            <FieldLabel asChild>
                                <div>Account aliases</div>
                            </FieldLabel>
                        </div>

                        {isLoadingAliases ? (
                            <div className='border-t border-gray-200 py-4 dark:border-gray-950'>
                                <Skeleton className='h-5 w-48' />
                            </div>
                        ) : hasAliasLoadError ? (
                            <div className='flex items-center justify-between gap-4 border-t border-gray-200 py-4 text-sm text-gray-700 dark:border-gray-950 dark:text-gray-600'>
                                <span>Could not load account aliases.</span>
                                <Button className='px-0 font-medium' variant='link' onClick={() => refetchAliases()}>
                                    Retry
                                </Button>
                            </div>
                        ) : (
                            <div className='divide-y divide-gray-200 border-t border-gray-200 dark:divide-gray-950 dark:border-gray-950'>
                                {aliases.map(alias => (
                                    <div key={alias.apId} className='flex items-center justify-between gap-4 py-4'>
                                        <div className='min-w-0 truncate text-base text-black dark:text-white'>{getAliasDisplayHandle(alias.apId)}</div>
                                        <Button
                                            className='shrink-0 px-0 font-medium text-gray-700 hover:text-red dark:text-gray-600 dark:hover:text-red'
                                            disabled={removingAlias === alias.apId}
                                            variant='link'
                                            onClick={() => handleRemoveAlias(alias.apId)}
                                        >
                                            {removingAlias === alias.apId ? <LoadingIndicator size='sm' /> : <><LucideIcon.Trash2 size={15} /> Unlink</>}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default AccountMigration;

import CustomizationModal from '../modal';
import {type EmailCustomizationDraft, type EmailCustomizationType, type EmailTypeAdapter} from '../types';
import {getEmailCustomizationAdapter} from '../adapters/registry';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useEffect, useMemo} from 'react';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '@src/components/providers/global-data-provider';

type EmailCustomizationControllerProps = {
    type?: string;
    id?: string;
    onAfterClose: () => void;
};

type LoadedControllerProps<TType extends EmailCustomizationType, TEntity, TDraft extends EmailCustomizationDraft> = {
    id: string;
    adapter: EmailTypeAdapter<TType, TEntity, TDraft>;
    onAfterClose: () => void;
};

const LoadedEmailCustomizationController = <TType extends EmailCustomizationType, TEntity, TDraft extends EmailCustomizationDraft>({id, adapter, onAfterClose}: LoadedControllerProps<TType, TEntity, TDraft>) => {
    const handleError = useHandleError();
    const {config, settings, siteData} = useGlobalData();
    const [siteTitle, siteIcon, commentsEnabledSetting] = getSettingValues<string>(settings, ['title', 'icon', 'comments_enabled']);
    const accentColor = siteData.accent_color || '#15171a';
    const commentsEnabled = commentsEnabledSetting !== 'off';

    const {data, isLoading} = adapter.useRead(id);
    const entity = adapter.getEntity(data);
    const {mutateAsync: editEntity} = adapter.useEdit();

    const initialDraft = useMemo(() => {
        return adapter.createDraft({
            id,
            entity
        });
    }, [adapter, entity, id]);

    const {clearError, errors, formState, saveState, handleSave, setFormState, updateForm, okProps} = useForm<TDraft>({
        initialState: initialDraft,
        savingDelay: 500,
        onSave: async (draft) => {
            if (!entity) {
                return;
            }

            await adapter.saveDraft({
                id,
                draft,
                entity,
                editEntity
            });
        },
        onValidate: draft => adapter.validateDraft?.(draft, {config}) || {},
        onSaveError: handleError
    });

    const adapterTabContextData = adapter.useTabContextData({
        id,
        draft: formState,
        entity,
        editEntity,
        onAfterClose
    });

    useEffect(() => {
        setFormState(() => initialDraft);
    }, [initialDraft, setFormState]);

    if (isLoading) {
        return null;
    }

    if (!entity) {
        return (
            <CustomizationModal
                afterClose={onAfterClose}
                dirty={false}
                okProps={{
                    disabled: true,
                    color: 'black'
                }}
                preview={<adapter.previewRenderer model={adapter.buildPreviewModel(formState)} />}
                tabs={[{
                    id: 'generalSettings',
                    title: 'General',
                    contents: <div className='text-grey-800 mt-6 px-7 text-sm'>Couldn&apos;t load this email configuration.</div>
                }]}
                testId={`${adapter.type}-customization-modal`}
                title={adapter.title}
                onOk={async () => {}}
            />
        );
    }

    const updateDraft = (fields: Partial<TDraft>) => {
        updateForm(state => ({...state, ...fields}));
    };

    const tabContext = {
        accentColor,
        clearError,
        commentsEnabled,
        entity,
        draft: formState,
        errors,
        ...adapterTabContextData,
        siteIcon: siteIcon || null,
        siteTitle: siteTitle || '',
        updateDraft
    };

    const tabDefinitions = adapter.buildTabDefinitions(tabContext);

    const tabs = tabDefinitions.map(definition => ({
        id: definition.id,
        title: definition.title,
        contents: definition.render(tabContext)
    }));

    return (
        <CustomizationModal
            afterClose={onAfterClose}
            dirty={saveState === 'unsaved'}
            okProps={okProps}
            preview={<adapter.previewRenderer model={adapter.buildPreviewModel(formState)} />}
            tabs={tabs}
            testId={`${adapter.type}-customization-modal`}
            title={adapter.title}
            onOk={async () => {
                await handleSave({fakeWhenUnchanged: true});
            }}
        />
    );
};

const EmailCustomizationController: React.FC<EmailCustomizationControllerProps> = ({type, id, onAfterClose}) => {
    const adapter = getEmailCustomizationAdapter(type);

    if (!adapter || !id) {
        return (
            <CustomizationModal
                afterClose={onAfterClose}
                dirty={false}
                okProps={{
                    disabled: true,
                    color: 'black'
                }}
                preview={null}
                tabs={[{
                    id: 'generalSettings',
                    title: 'General',
                    contents: <div className='text-grey-800 mt-6 px-7 text-sm'>Unsupported email type.</div>
                }]}
                testId='email-customization-modal'
                title='Customize email'
                onOk={async () => {}}
            />
        );
    }

    return <LoadedEmailCustomizationController adapter={adapter} id={id} onAfterClose={onAfterClose} />;
};

export default EmailCustomizationController;

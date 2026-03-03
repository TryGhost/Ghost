import CustomizationModal from '../modal';
import {type EmailCustomizationFormState, type EmailCustomizationType, type EmailTypeAdapter} from '../types';
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

type LoadedControllerProps<TType extends EmailCustomizationType, TEntity, TFormState extends EmailCustomizationFormState> = {
    id: string;
    adapter: EmailTypeAdapter<TType, TEntity, TFormState>;
    onAfterClose: () => void;
};

const LoadedEmailCustomizationController = <TType extends EmailCustomizationType, TEntity, TFormState extends EmailCustomizationFormState>({id, adapter, onAfterClose}: LoadedControllerProps<TType, TEntity, TFormState>) => {
    const handleError = useHandleError();
    const {config, settings, siteData} = useGlobalData();
    const [siteTitle, siteIcon, commentsEnabledSetting] = getSettingValues<string>(settings, ['title', 'icon', 'comments_enabled']);
    const accentColor = siteData.accent_color || '#15171a';
    const commentsEnabled = commentsEnabledSetting !== 'off';

    const {data, isLoading} = adapter.useRead(id);
    const entity = adapter.getEntity(data);
    const {mutateAsync: editEntity} = adapter.useEdit();

    // eslint-disable-next-line react-hooks/rules-of-hooks -- useAdditionalData is stable per adapter type
    const additionalDataResult = adapter.useAdditionalData ? adapter.useAdditionalData(id) : {data: undefined, isLoading: false};
    const additionalData = additionalDataResult.data;
    const additionalDataLoading = additionalDataResult.isLoading;

    const initialFormState = useMemo(() => {
        return adapter.createFormState({
            id,
            entity,
            additionalData
        });
    }, [adapter, entity, id, additionalData]);

    const {clearError, errors, formState, saveState, handleSave, setFormState, updateForm, okProps} = useForm<TFormState>({
        initialState: initialFormState,
        savingDelay: 500,
        onSave: async (nextFormState) => {
            if (!entity) {
                return;
            }

            await adapter.saveFormState({
                id,
                formState: nextFormState,
                entity,
                editEntity,
                additionalData
            });
        },
        onValidate: nextFormState => adapter.validateFormState?.(nextFormState, {config}) || {},
        onSaveError: handleError
    });

    const adapterTabContextData = adapter.useTabContextData({
        id,
        formState,
        entity,
        editEntity,
        onAfterClose
    });

    useEffect(() => {
        setFormState(() => initialFormState);
    }, [initialFormState, setFormState]);

    if (isLoading || additionalDataLoading) {
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
                    contents: <div className='mt-6 px-7 text-sm text-grey-800'>Couldn&apos;t load this email configuration.</div>
                }]}
                testId={`${adapter.type}-customization-modal`}
                title={adapter.title}
                onOk={async () => {}}
            />
        );
    }

    const updateFormState = (fields: Partial<TFormState>) => {
        updateForm(state => ({...state, ...fields}));
    };

    const tabContext = {
        accentColor,
        clearError,
        commentsEnabled,
        entity,
        formState,
        errors,
        ...adapterTabContextData,
        siteIcon: siteIcon || null,
        siteTitle: siteTitle || '',
        updateFormState
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
                    contents: <div className='mt-6 px-7 text-sm text-grey-800'>Unsupported email type.</div>
                }]}
                testId='email-customization-modal'
                title='Customize email'
                onOk={async () => {}}
            />
        );
    }

    if (adapter.type === 'newsletter') {
        return <LoadedEmailCustomizationController adapter={adapter} id={id} onAfterClose={onAfterClose} />;
    }

    return <LoadedEmailCustomizationController adapter={adapter} id={id} onAfterClose={onAfterClose} />;
};

export default EmailCustomizationController;

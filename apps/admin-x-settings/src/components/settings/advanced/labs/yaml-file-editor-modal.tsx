import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useMemo, useState} from 'react';
import {APIError, JSONError} from '@tryghost/admin-x-framework/errors';
import {ButtonGroup, CodeEditor, Heading, Modal, showToast} from '@tryghost/admin-x-design-system';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

export interface YamlFileEditorModalProps {
    title: string;
    hint?: React.ReactNode;
    testId: string;
    downloadPath: string;
    uploadFilename: string;
    successMessage: string;
    onUpload: (file: File) => Promise<unknown>;
    afterClose?: () => void;
}

const extractErrorMessage = (error: unknown): string => {
    if (error instanceof JSONError && error.data?.errors?.[0]) {
        return error.data.errors[0].context || error.data.errors[0].message;
    }

    if (error instanceof APIError) {
        return error.message;
    }

    return 'Something went wrong, please try again.';
};

const YamlFileEditorModal: React.FC<YamlFileEditorModalProps> = ({
    title,
    hint,
    testId,
    downloadPath,
    uploadFilename,
    successMessage,
    onUpload,
    afterClose
}) => {
    const modal = useModal();
    const handleError = useHandleError();

    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const yamlExtension = useMemo(() => import('@codemirror/lang-yaml').then(module => module.yaml()), []);

    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            setIsLoading(true);
            setLoadError(null);

            try {
                const {apiRoot} = getGhostPaths();
                const response = await fetch(`${apiRoot}${downloadPath}`, {
                    credentials: 'include',
                    headers: {
                        Accept: 'text/yaml, text/plain, */*'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to load ${uploadFilename} (${response.status})`);
                }

                const text = await response.text();

                if (isMounted) {
                    setContent(text);
                }
            } catch (error) {
                if (isMounted) {
                    setLoadError(error instanceof Error ? error.message : `Failed to load ${uploadFilename}`);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadContent();

        return () => {
            isMounted = false;
        };
    }, [downloadPath, uploadFilename]);

    const closeModal = () => {
        modal.remove();
        afterClose?.();
    };

    const handleSave = async () => {
        if (isSaving || isLoading || loadError) {
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            const file = new File([content], uploadFilename, {type: 'text/yaml'});
            await onUpload(file);

            showToast({
                type: 'success',
                title: successMessage
            });

            closeModal();
        } catch (error) {
            setSaveError(extractErrorMessage(error));
            handleError(error, {withToast: false});
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                void handleSave();
            }
        };

        window.addEventListener('keydown', handleKeydown);

        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    });

    const canSave = !isLoading && !loadError && !isSaving;

    return (
        <Modal
            afterClose={afterClose}
            backDropClick={false}
            cancelLabel='Close'
            footer={<></>}
            height='full'
            size='full'
            testId={testId}
        >
            <div className='flex h-full min-h-0 flex-col'>
                <div className='mb-4 flex items-center justify-between'>
                    <Heading level={2}>{title}</Heading>
                    <ButtonGroup buttons={[
                        {
                            label: 'Close',
                            color: 'outline',
                            onClick: closeModal
                        },
                        {
                            disabled: !canSave,
                            label: isSaving ? 'Saving...' : 'Save',
                            color: 'black',
                            onClick: () => void handleSave()
                        }
                    ]} />
                </div>

                {(loadError || saveError) && (
                    <div className='mb-4 rounded-sm border border-red bg-red/5 px-4 py-2 text-sm text-red' data-testid='yaml-editor-error'>
                        {saveError || loadError}
                    </div>
                )}

                <div className='mb-16 min-h-0 flex-auto'>
                    {!isLoading && (
                        <CodeEditor
                            data-testid='yaml-editor'
                            extensions={[yamlExtension]}
                            height='full'
                            hint={hint}
                            value={content}
                            autoFocus
                            onChange={setContent}
                        />
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(YamlFileEditorModal);

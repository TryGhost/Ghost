import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import clsx from 'clsx';
import {ConfirmationModal, FileUpload, Icon} from '@tryghost/admin-x-design-system';
import {ReactComponent as MailchimpIcon} from '../../../../assets/icons/mailchimp.svg';
import {ReactComponent as MediumIcon} from '../../../../assets/icons/medium.svg';
import {ReactComponent as SubstackIcon} from '../../../../assets/icons/substack.svg';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useImportContent} from '@tryghost/admin-x-framework/api/db';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const ImportModalContent = () => {
    const modal = useModal();
    const {mutateAsync: importContent} = useImportContent();
    const [uploading, setUploading] = useState(false);
    const handleError = useHandleError();

    return <FileUpload
        id="import-file"
        onUpload={async (file) => {
            setUploading(true);
            try {
                await importContent(file);
                modal.remove();
                NiceModal.show(ConfirmationModal, {
                    title: 'Import in progress',
                    prompt: `Your import is being processed, and you'll receive a confirmation email as soon as it's complete. Usually this only takes a few minutes, but larger imports may take longer.`,
                    cancelLabel: '',
                    okLabel: 'Got it',
                    onOk: confirmModal => confirmModal?.remove(),
                    formSheet: false
                });
            } catch (e) {
                handleError(e);
            } finally {
                setUploading(false);
            }
        }}
    >
        <div className="cursor-pointer bg-grey-75 p-10 text-center dark:bg-grey-950">
            {uploading ? 'Uploading ...' : 'Select a JSON or zip file'}
        </div>
    </FileUpload>;
};

const ImportButton: React.FC<{
    icon?: React.ReactNode,
    title?: string,
    onClick?: () => void
}> = ({
    icon,
    title,
    onClick
}) => {
    const classNames = clsx(
        'flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-grey-100 px-2 text-sm font-semibold transition-all hover:bg-grey-200'
    );
    if (onClick) {
        return (
            <button className={classNames} type='button' onClick={onClick}>
                {icon}
                {title}
            </button>
        );
    } else {
        return <></>;
    }
};

const MigrationToolsImport: React.FC = () => {
    const {updateRoute} = useRouting();
    const handleImportContent = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Import content',
            prompt: <ImportModalContent />,
            okLabel: '',
            formSheet: false
        });
    };

    return (
        <div className='grid grid-cols-3 gap-4 pt-4'>
            <ImportButton
                icon={
                    <SubstackIcon className='h-[18px] w-auto' />
                }
                title='Substack'
                onClick={() => updateRoute({isExternal: true, route: 'migrate'})}
            />
            <ImportButton
                icon={
                    <MediumIcon className='h-[18px] w-auto' />
                }
                title='Medium'
                onClick={() => updateRoute({isExternal: true, route: 'migrate'})}
            />
            <ImportButton
                icon={
                    <MailchimpIcon className='h-5 w-auto' />
                }
                title='Mailchimp'
                onClick={() => updateRoute({isExternal: true, route: 'migrate'})}
            />
            <ImportButton
                icon={
                    <Icon className='h-4 w-auto' name='import' />
                }
                title='Universal import'
                onClick={handleImportContent}
            />
        </div>
    );
};

export default MigrationToolsImport;

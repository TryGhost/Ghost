import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import UniversalImportModal from './UniversalImportModal';
import clsx from 'clsx';
import {Icon} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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
        'flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-grey-100 px-2 text-sm font-semibold transition-all hover:bg-grey-200 dark:bg-grey-900'
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
        NiceModal.show(UniversalImportModal);
    };

    return (
        <div className='grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3'>
            <ImportButton
                icon={
                    <Icon className='w-auto' name='substack' size={18} />
                }
                title='Substack'
                onClick={() => updateRoute({isExternal: true, route: '/migrate/substack'})}
            />
            <ImportButton
                icon={
                    <Icon className='w-auto' name='wordpress' size={18} />
                }
                title='WordPress'
                onClick={() => updateRoute({isExternal: true, route: '/migrate/wordpress'})}
            />
            <ImportButton
                icon={
                    <Icon className='w-auto' name='squarespace' size={18} />
                }
                title='Squarespace'
                onClick={() => updateRoute({isExternal: true, route: '/migrate/squarespace'})}
            />
            <ImportButton
                icon={
                    <Icon className='w-auto dark:invert' name='medium' size={18} />
                }
                title='Medium'
                onClick={() => updateRoute({isExternal: true, route: '/migrate/medium'})}
            />
            <ImportButton
                icon={
                    <Icon className='w-auto' name='mailchimp' size={20} />
                }
                title='Mailchimp'
                onClick={() => updateRoute({isExternal: true, route: '/migrate/mailchimp'})}
            />
            <ImportButton
                icon={
                    <Icon className='w-auto' name='import' size={16} />
                }
                title='Universal import'
                onClick={handleImportContent}
            />
        </div>
    );
};

export default MigrationToolsImport;

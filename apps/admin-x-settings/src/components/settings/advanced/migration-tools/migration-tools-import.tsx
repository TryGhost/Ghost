import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import UniversalImportModal from './universal-import-modal';
import {Button} from '@tryghost/shade/components';
import {Icon} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const MigrationToolsImport: React.FC = () => {
    const {updateRoute} = useRouting();

    const handleImportContent = () => {
        NiceModal.show(UniversalImportModal);
    };

    const importers = [
        {icon: <Icon className='w-auto' name='substack' size={18} />, title: 'Substack', onClick: () => updateRoute({isExternal: true, route: '/migrate/substack'})},
        {icon: <Icon className='w-auto' name='beehiiv' size={18} />, title: 'beehiiv', onClick: () => updateRoute({isExternal: true, route: '/migrate/beehiiv'})},
        {icon: <Icon className='w-auto' name='wordpress' size={18} />, title: 'WordPress', onClick: () => updateRoute({isExternal: true, route: '/migrate/wordpress'})},
        {icon: <Icon className='w-auto' name='squarespace' size={18} />, title: 'Squarespace', onClick: () => updateRoute({isExternal: true, route: '/migrate/squarespace'})},
        {icon: <Icon className='w-auto dark:invert' name='medium' size={18} />, title: 'Medium', onClick: () => updateRoute({isExternal: true, route: '/migrate/medium'})},
        {icon: <Icon className='w-auto' name='mailchimp' size={20} />, title: 'Mailchimp', onClick: () => updateRoute({isExternal: true, route: '/migrate/mailchimp'})},
        {icon: <Icon className='w-auto' name='import' size={16} />, title: 'Universal import', onClick: handleImportContent}
    ];

    return (
        <div className='grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3'>
            {importers.map(importer => (
                <Button key={importer.title} className='h-9 font-semibold' type='button' variant='secondary' onClick={importer.onClick}>
                    {importer.icon}
                    {importer.title}
                </Button>
            ))}
        </div>
    );
};

export default MigrationToolsImport;

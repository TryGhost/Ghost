import BrandIcon from '@/settings/components/icons/brand-icon';
import React, {useState} from 'react';
import UniversalImportModal from './universal-import-modal';
import {Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {useSettingsNavigation} from '@/settings/hooks/use-settings-navigation';
import {DialogPortal} from '@/settings/providers/dialog-portal';

const MigrationToolsImport: React.FC = () => {
    const {updateRoute} = useSettingsNavigation();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const handleImportContent = () => {
        setIsImportModalOpen(true);
    };

    const importers = [
        {icon: <BrandIcon className='w-auto' name='substack' size={18} />, title: 'Substack', onClick: () => updateRoute({isExternal: true, route: '/migrate/substack'})},
        {icon: <BrandIcon className='w-auto' name='beehiiv' size={18} />, title: 'beehiiv', onClick: () => updateRoute({isExternal: true, route: '/migrate/beehiiv'})},
        {icon: <BrandIcon className='w-auto' name='wordpress' size={18} />, title: 'WordPress', onClick: () => updateRoute({isExternal: true, route: '/migrate/wordpress'})},
        {icon: <BrandIcon className='w-auto' name='squarespace' size={18} />, title: 'Squarespace', onClick: () => updateRoute({isExternal: true, route: '/migrate/squarespace'})},
        {icon: <BrandIcon className='w-auto dark:invert' name='medium' size={18} />, title: 'Medium', onClick: () => updateRoute({isExternal: true, route: '/migrate/medium'})},
        {icon: <BrandIcon className='w-auto' name='mailchimp' size={20} />, title: 'Mailchimp', onClick: () => updateRoute({isExternal: true, route: '/migrate/mailchimp'})},
        {icon: <LucideIcon.Import className='size-4' />, title: 'Universal import', onClick: handleImportContent}
    ];

    return (
        <div className='grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3'>
            {importers.map(importer => (
                <Button key={importer.title} className='h-9 font-semibold' type='button' variant='secondary' onClick={importer.onClick}>
                    {importer.icon}
                    {importer.title}
                </Button>
            ))}
            {isImportModalOpen && <DialogPortal><UniversalImportModal onClose={() => setIsImportModalOpen(false)} /></DialogPortal>}
        </div>
    );
};

export default MigrationToolsImport;

import React from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {downloadAllContent} from '@tryghost/admin-x-framework/api/db';

const MigrationToolsExport: React.FC = () => {
    return (
        <div className='flex flex-col items-center gap-3 pb-5 pt-10'>
            <div>Download all of your <strong>posts and settings</strong> in a single, glorious JSON file.</div>
            <Button className='!h-9 !font-semibold' color='grey' icon='export' iconColorClass='!h-5 !w-auto' label='Export content' onClick={() => downloadAllContent()} />
        </div>
    );
};

export default MigrationToolsExport;

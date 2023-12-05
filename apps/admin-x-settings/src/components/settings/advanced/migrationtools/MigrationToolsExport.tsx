import React from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {downloadAllContent} from '@tryghost/admin-x-framework/api/db';

const MigrationToolsExport: React.FC = () => {
    return (
        <Button color='grey' label='Export' size='sm' onClick={() => downloadAllContent()} />
    );
};

export default MigrationToolsExport;

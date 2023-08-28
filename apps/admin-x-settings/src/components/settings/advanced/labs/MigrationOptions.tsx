import Button from '../../../../admin-x-ds/global/Button';
import LabItem from './LabItem';
import List from '../../../../admin-x-ds/global/List';
import React from 'react';

const MigrationOptions: React.FC = () => {
    return (
        <List titleSeparator={false}>
            <LabItem
                action={<Button color='grey' label='Open importer' size='sm' />}
                detail='Import posts from a JSON or zip file'
                title='Import content' />
            <LabItem
                action={<Button color='grey' label='Export' size='sm' />}
                detail='Download all of your posts and settings in a single, glorious JSON file'
                title='Export your content' />
            <LabItem
                action={<Button color='red' label='Delete' size='sm' />}
                detail='Permanently delete all posts and tags from the database, a hard reset'
                title='Delete all content' />
        </List>
    );
};

export default MigrationOptions;

import Button from '../../../admin-x-ds/global/Button';
import LabsBubbles from '../../../assets/images/labs-bg.svg';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupHeader from '../../../admin-x-ds/settings/SettingGroupHeader';
import TabView from '../../../admin-x-ds/global/TabView';
import Toggle from '../../../admin-x-ds/global/form/Toggle';

const LabItem: React.FC<{
    title?: React.ReactNode;
    detail?: React.ReactNode;
    action?: React.ReactNode;
}> = ({
    title,
    detail,
    action
}) => {
    return (
        <ListItem
            action={action}
            bgOnHover={false}
            detail={detail}
            paddingRight={false}
            title={title}
        />
    );
};

const MigrationOptions: React.FC = () => {
    return (
        <List titleSeparator={false}>
            <LabItem
                action={<Button color='grey' label='Open importer' size='sm' />}
                detail='Import posts from a JSON or zip file'
                title='Import content'
            />
            <LabItem
                action={<Button color='grey' label='Export' size='sm' />}
                detail='Download all of your posts and settings in a single, glorious JSON file'
                title='Export your content'
            />
            <LabItem
                action={<Button color='red' label='Delete' size='sm' />}
                detail='Permanently delete all posts and tags from the database, a hard reset'
                title='Delete all content'
            />
        </List>
    );
};

/*
<a className='text-green' href="" rel="noopener noreferrer" target="_blank"></a>
*/

const AlphaFeatures: React.FC = () => {
    return (
        <List titleSeparator={false}>
            <LabItem
                action={<Toggle />}
                detail={<>Try out <a className='text-green' href="https://ghost.org/changelog/editor-beta/" rel="noopener noreferrer" target="_blank">Ghost{`'`}s brand new editor</a>, and get early access to the latest features and improvements</>}
                title='Ghost editor (beta)'
            />
            <LabItem
                action={<Button color='grey' label='Open' size='sm' />}
                detail={<>A <a className='text-green' href="https://ghost.org/help/importing-from-substack/" rel="noopener noreferrer" target="_blank">step-by-step tool</a> to easily import all your content, members and paid subscriptions</>}
                title='Substack migrator'
            />
            <LabItem
                action={<Toggle />}
                detail={<>Translate your membership flows into your publication language (<a className='text-green' href="https://github.com/TryGhost/Ghost/tree/main/ghost/i18n/locales" rel="noopener noreferrer" target="_blank">supported languages</a>). Don’t see yours? <a className='text-green' href="https://forum.ghost.org/t/help-translate-ghost-beta/37461" rel="noopener noreferrer" target="_blank">Get involved</a></>}
                title='Portal translation'
            />
            <LabItem
                action={
                    <div className='flex flex-col items-end gap-1'>
                        <Button color='grey' label='Upload redirects file' size='sm' />
                        <Button color='green' label='Download current redirects' link />
                    </div>
                }
                detail={<>Configure redirects for old or moved content, <br /> more info in the <a className='text-green' href="https://ghost.org/tutorials/implementing-redirects/" rel="noopener noreferrer" target="_blank">docs</a></>}
                title='Redirects'
            />
            <LabItem
                action={
                    <div className='flex flex-col items-end gap-1'>
                        <Button color='grey' label='Upload routes file' size='sm' />
                        <Button color='green' label='Download current routes' link />
                    </div>
                }
                detail='Configure dynamic routing by modifying the routes.yaml file'
                title='Routes'
            />
        </List>
    );
};

const BetaFeautres: React.FC = () => {
    return (
        <List titleSeparator={false}>
            <LabItem
                action={<Toggle />}
                detail='This is dynamic'
                title='Example beta feature'
            />
        </List>
    );
};

const Labs: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<'labs-migration-options' | 'labs-alpha-features' | 'labs-beta-features'>('labs-migration-options');
    const [isOpen, setIsOpen] = useState(false);

    const tabs = [
        {
            id: 'labs-migration-options',
            title: 'Migration options',
            contents: <MigrationOptions />
        },
        {
            id: 'labs-alpha-features',
            title: 'Alpha features',
            contents: <AlphaFeatures />
        },
        {
            id: 'labs-beta-features',
            title: 'Beta features',
            contents: <BetaFeautres />
        }
    ] as const;

    return (
        <SettingGroup
            customHeader={
                <div className='z-10 flex items-start justify-between'>
                    <SettingGroupHeader description='This is a testing ground for new or experimental features. They may change, break or inexplicably disappear at any time.' title='Labs' />
                    {
                        !isOpen ?
                            <Button color='green' label='Open' link onClick={() => {
                                setIsOpen(true);
                            }} /> :
                            <Button color='green' label='Close' link onClick={() => {
                                setIsOpen(false);
                            }} />
                    }
                </div>
            }
            isEditing={isOpen}
            keywords={keywords}
            navid='labs'
            testId='labs'
        >
            {isOpen ?
                <TabView<'labs-migration-options' | 'labs-alpha-features' | 'labs-beta-features'> selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
                :
                <div className='absolute inset-0 z-0 overflow-hidden opacity-70'>
                    <img className='absolute -right-6 -top-6' src={LabsBubbles} />
                </div>
            }
        </SettingGroup>
    );
};

export default Labs;

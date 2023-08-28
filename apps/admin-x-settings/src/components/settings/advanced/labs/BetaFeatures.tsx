import Button from '../../../../admin-x-ds/global/Button';
import FeatureToggle from './FeatureToggle';
import LabItem from './LabItem';
import List from '../../../../admin-x-ds/global/List';
import React from 'react';
import useRouting from '../../../../hooks/useRouting';

const BetaFeatures: React.FC = () => {
    const {updateRoute} = useRouting();

    return (
        <List titleSeparator={false}>
            <LabItem
                action={<FeatureToggle flag='lexicalEditor' />}
                detail={<>Try out <a className='text-green' href="https://ghost.org/changelog/editor-beta/" rel="noopener noreferrer" target="_blank">Ghost{`'`}s brand new editor</a>, and get early access to the latest features and improvements</>}
                title='Ghost editor (beta)' />
            <LabItem
                action={<Button color='grey' label='Open' size='sm' onClick={() => updateRoute({isExternal: true, route: 'migrate'})} />}
                detail={<>A <a className='text-green' href="https://ghost.org/help/importing-from-substack/" rel="noopener noreferrer" target="_blank">step-by-step tool</a> to easily import all your content, members and paid subscriptions</>}
                title='Substack migrator' />
            <LabItem
                action={<FeatureToggle flag='i18n' />}
                detail={<>Translate your membership flows into your publication language (<a className='text-green' href="https://github.com/TryGhost/Ghost/tree/main/ghost/i18n/locales" rel="noopener noreferrer" target="_blank">supported languages</a>). Don’t see yours? <a className='text-green' href="https://forum.ghost.org/t/help-translate-ghost-beta/37461" rel="noopener noreferrer" target="_blank">Get involved</a></>}
                title='Portal translation' />
            <LabItem
                action={<div className='flex flex-col items-end gap-1'>
                    <Button color='grey' label='Upload redirects file' size='sm' />
                    <Button color='green' label='Download current redirects' link />
                </div>}
                detail={<>Configure redirects for old or moved content, <br /> more info in the <a className='text-green' href="https://ghost.org/tutorials/implementing-redirects/" rel="noopener noreferrer" target="_blank">docs</a></>}
                title='Redirects' />
            <LabItem
                action={<div className='flex flex-col items-end gap-1'>
                    <Button color='grey' label='Upload routes file' size='sm' />
                    <Button color='green' label='Download current routes' link />
                </div>}
                detail='Configure dynamic routing by modifying the routes.yaml file'
                title='Routes' />
        </List>
    );
};

export default BetaFeatures;

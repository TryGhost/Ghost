import {Select} from '@tryghost/admin-x-design-system';
import {User, isOwnerUser} from '@tryghost/admin-x-framework/api/users';
import {useBrowseRoles} from '@tryghost/admin-x-framework/api/roles';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const RoleSelector: React.FC<{ user: User; setUserData: (user: User) => void; }> = ({user, setUserData}) => {
    const {data: {roles} = {}} = useBrowseRoles();
    const {config} = useGlobalData();
    const editorBeta = config.labs.superEditors;

    let optionsArray = [
        {
            hint: 'Can write and edit their own posts, but cannot publish them.',
            label: 'Contributor',
            value: 'contributor'
        },
        {
            hint: 'Can create, edit and publish their own posts, but can’t modify others.',
            label: 'Author',
            value: 'author'
        },
        {
            hint: 'Can edit and publish any posts, and manage Authors and Contributors.',
            label: 'Editor',
            value: 'editor'
        },
        {
            hint: 'Trusted user who has full access to all content, settings, and user management.',
            label: 'Administrator',
            value: 'administrator'
        }
    ];
    // if the editor beta is enabled, replace the editor role with super editor
    if (editorBeta) {
        optionsArray = optionsArray.map((option) => {
            if (option.value === 'editor') {
                return {
                    ...option,
                    label: 'Editor (beta mode)',
                    value: 'super editor',
                    hint: 'Can invite and manage other Authors and Contributors, as well as edit and publish any posts on the site. Can manage members and moderate comments.'
                };
            }
            return option;
        });
    }

    if (isOwnerUser(user)) {
        const ownerOption = {
            label: 'Owner',
            value: 'owner'
        };
        return (
            <div>
                <Select
                    disabled={true}
                    hint={
                        <>
                            This user is the owner of the site. <a className='font-medium text-grey-800 transition-colors hover:text-grey-900 dark:text-grey-500 dark:hover:text-grey-400' href='https://ghost.org/help/transfer-publication-ownership/' rel='noopener noreferrer' target='_blank'>Transfer ownership</a> first to change their role.
                        </>
                    }
                    options={[ownerOption]}
                    selectedOption={ownerOption}
                    title="Role"
                    onSelect={() => {}}
                />
            </div>
        );
    }

    return (
        <Select
            options={optionsArray}
            selectedOption={optionsArray.find(option => option.value === user.roles[0].name.toLowerCase())}
            testId='role-select'
            title="Role"
            onSelect={(option) => {
                if (option) {
                    const role = roles?.find(r => r.name.toLowerCase() === option.value.toLowerCase());
                    if (role) {
                        setUserData?.({...user, roles: [role]});
                    }
                }
            }}
        />
    );
};

export default RoleSelector;

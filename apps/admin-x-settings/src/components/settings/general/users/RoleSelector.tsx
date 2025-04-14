import {Heading, Icon, Radio} from '@tryghost/admin-x-design-system';
import {User, isOwnerUser} from '@tryghost/admin-x-framework/api/users';
import {useBrowseRoles} from '@tryghost/admin-x-framework/api/roles';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const RoleSelector: React.FC<{ user: User; setUserData: (user: User) => void; }> = ({user, setUserData}) => {
    const {data: {roles} = {}} = useBrowseRoles();
    const {config} = useGlobalData();
    const editorBeta = config.labs.superEditors;

    if (isOwnerUser(user)) {
        return (
            <div>
                <Heading useLabelTag={true}>Role</Heading>
                <div className='mt-1.5 flex flex-col items-center justify-center gap-3 rounded-lg bg-grey-75 px-8 py-10 text-center text-sm text-grey-800 dark:bg-grey-950 dark:text-white'>
                    <Icon colorClass='text-grey-800 dark:text-white' name='crown' size='lg' />
                    This user is the owner of the site. To change their role, you need to transfer the ownership first.
                </div>
            </div>
        );
    }
    let optionsArray = [
        {
            hint: 'Can create and edit their own posts, but cannot publish. An Editor needs to approve and publish for them.',
            label: 'Contributor',
            value: 'contributor'
        },
        {
            hint: 'A trusted user who can create, edit and publish their own posts, but can’t modify others.',
            label: 'Author',
            value: 'author'
        },
        {
            hint: 'Can invite and manage other Authors and Contributors, as well as edit and publish any posts on the site.',
            label: 'Editor',
            value: 'editor'
        },
        {
            hint: 'Trusted staff user who should be able to manage all content and users, as well as site settings and options.',
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

    return (
        <Radio
            id='role'
            options={optionsArray}
            selectedOption={user.roles[0].name.toLowerCase()}
            title="Role"
            onSelect={(value) => {
                const role = roles?.find(r => r.name.toLowerCase() === value.toLowerCase());
                if (role) {
                    setUserData?.({...user, roles: [role]});
                }
            }}
        />
    );
};

export default RoleSelector;

import Modal from '../../../../admin-x-ds/global/Modal';
import NiceModal from '@ebay/nice-modal-react';
import Radio from '../../../../admin-x-ds/global/Radio';
import TextField from '../../../../admin-x-ds/global/TextField';
import {useEffect, useRef} from 'react';

const InviteUserModal = NiceModal.create(() => {
    const focusRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (focusRef.current) {
            focusRef.current.focus();
        }
    });

    return (
        <Modal 
            cancelLabel=''
            okLabel='Send invitation now'
            size={540}
            title='Invite a new staff user'
            onOk={() => {
                // Handle invite user
            }}
        >
            <div className='flex flex-col gap-6 py-4'>
                <p>
                    Send an invitation for a new person to create a staff account on your site, and select a role that matches what you’d like them to be able to do.
                </p>
                <TextField 
                    clearBg={true}
                    inputRef={focusRef}
                    placeholder='jamie@example.com'
                    title='Email address'
                />
                <div>
                    <Radio
                        defaultSelectedOption={'contributor'}
                        id='role'
                        options={[
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
                        ]}
                        separator={true}
                        title="Role"
                        onSelect={() => {}}
                    />
                </div>
            </div>
        </Modal>
    );
});

export default InviteUserModal;
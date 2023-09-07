import Button from '../../../admin-x-ds/global/Button';
import ColorIndicator from '../../../admin-x-ds/global/form/ColorIndicator';
import Form from '../../../admin-x-ds/global/form/Form';
import Heading from '../../../admin-x-ds/global/Heading';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import MultiSelect from '../../../admin-x-ds/global/form/MultiSelect';
import NiceModal from '@ebay/nice-modal-react';
import Radio from '../../../admin-x-ds/global/form/Radio';
import TextArea from '../../../admin-x-ds/global/form/TextArea';
import useRouting from '../../../hooks/useRouting';

const Preview: React.FC = () => {
    return (
        <div className='hidden rounded-md bg-grey-100 text-grey-600 md:!visible md:!block'>
            preview
        </div>
    );
};

const Sidebar: React.FC = () => {
    return (
        <div className='flex h-full flex-col justify-between'>
            <div>
                <Heading className='mb-4' level={4}>Embed signup form</Heading>
                <Form>
                    <Radio
                        id='embed-layout'
                        options={[
                            {
                                label: 'Branded',
                                value: 'branded'
                            },
                            {
                                label: 'Minimal',
                                value: 'minimal'
                            }
                        ]}
                        selectedOption='branded'
                        title='Layout'
                        onSelect={() => {}}
                    />
                    <ColorIndicator
                        isExpanded={false}
                        swatches={[
                            {
                                hex: '#08090c',
                                title: 'Dark'
                            },
                            {
                                hex: '#ffffff',
                                title: 'Light'
                            },
                            {
                                hex: '#ffdd00',
                                title: 'Accent'
                            }
                        ]}
                        swatchSize='lg'
                        title='Background color'
                        onSwatchChange={() => {}}
                        onTogglePicker={() => {}}
                    />
                    <MultiSelect
                        hint='Will be applied to all members signing up via this form'
                        options={[
                            {
                                label: 'Steph',
                                value: 'steph'
                            },
                            {
                                label: 'Klay',
                                value: 'klay'
                            },
                            {
                                label: 'Loons',
                                value: 'loons'
                            }
                        ]}
                        placeholder='Pick one or more labels (optional)'
                        title='Labels at signup'
                        values={[]}
                        onChange={() => {}}
                    />
                    <TextArea
                        className='text-grey-800'
                        clearBg={false}
                        fontStyle='mono'
                        hint={`Paste this code onto any website where you'd like your signup to appear.`}
                        title='Embed code'
                        value={`<div style="height: 40vmin;min-height: 360px"><script src="https://cdn.jsdelivr.net/ghost/signup-form@~0.1/umd/signup-form.min.js" data-background-color="#F1F3F4" data-text-color="#000000" data-button-color="#d74780" data-button-text-color="#FFFFFF" data-title="Zimo&#039;s Secret Volcano Lair" data-description="You Know, I Have One Simple Request, And That Is To Have Sharks With Frickin&#039; Laser Beams Attached To Their Heads!" data-site="http://localhost:2368" async></script></div>`}
                    />
                </Form>
            </div>
            <Button className='self-end' color='black' label='Copy code' />
        </div>
    );
};

const EmbedSignupFormModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();

    return (
        <Modal
            afterClose={() => {
                updateRoute('embed-signup-form');
            }}
            cancelLabel=''
            footer={false}
            size={1120}
            testId='embed-signup-form'
            title=''
            topRightContent='close'
        >
            <div className='grid grid-cols-1 gap-6 pb-8 md:grid-cols-[5.5fr_2.5fr]'>
                <Preview />
                <Sidebar />
            </div>
        </Modal>
    );
});

export default EmbedSignupFormModal;

import Avatar from '../../../../admin-x-ds/global/Avatar';
import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import useRouting from '../../../../hooks/useRouting';

interface AddRecommendationModalProps {}

const AddRecommendationModal: React.FC<AddRecommendationModalProps> = () => {
    const {updateRoute} = useRouting();

    return <Modal
        afterClose={() => {
            updateRoute('recommendations');
        }}
        cancelLabel='Back'
        okColor='black'
        okLabel='Add'
        size='sm'
        testId='add-recommendation-modal'
        title='Add recommendation'
    >
        <Form
            marginBottom={false}
            marginTop
        >
            <div className='mb-4 flex items-center gap-3 rounded-sm border border-grey-300 p-3'>
                <Avatar image='https://www.shesabeast.co/content/images/size/w256h256/2022/08/transparent-icon-black-copy-gray-bar.png' labelColor='white' />
                <div className={`flex grow flex-col`}>
                    <span className='mb-0.5 font-medium'>She‘s A Beast</span>
                    <span className='text-xs leading-snug text-grey-700'>shesabeast.co</span>
                </div>
            </div>
            <TextArea
                clearBg={true}
                rows={3}
                title="Reason for recommending"
            />
        </Form>
    </Modal>;
};

export default NiceModal.create(AddRecommendationModal);

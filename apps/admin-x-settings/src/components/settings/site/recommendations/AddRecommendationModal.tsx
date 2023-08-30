import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import URLTextField from '../../../../admin-x-ds/global/form/URLTextField';
import useRouting from '../../../../hooks/useRouting';

interface AddRecommendationModalProps {}

const AddRecommendationModal: React.FC<AddRecommendationModalProps> = () => {
    const {updateRoute} = useRouting();

    const openAddNewRecommendationModal = () => {
        updateRoute('recommendations/add-confirm');
    };

    // TODO: Add error message
    return <Modal
        afterClose={() => {
            updateRoute('recommendations');
        }}
        okColor='black'
        okLabel='Next'
        size='sm'
        testId='add-recommendation-modal'
        title='Add recommendation'
    >
        <Form
            marginBottom={false}
            marginTop
        >
            <URLTextField
                baseUrl=''
                hint={<>Need inspiration? <a className='text-green' href="https://www.ghost.org/explore" rel="noopener noreferrer" target='_blank'>Explore thousands of sites</a> to recommend</>}
                placeholder='https://www.example.com'
                title='URL'
                onChange={openAddNewRecommendationModal}
            />
        </Form>
    </Modal>;
};

export default NiceModal.create(AddRecommendationModal);

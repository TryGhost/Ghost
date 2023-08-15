import Button from '../../../../admin-x-ds/global/Button';
import Form from '../../../../admin-x-ds/global/form/Form';
import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import pinturaScreenshot from '../../../../assets/images/pintura-screenshot.png';
import {ReactComponent as Icon} from '../../../../assets/icons/pintura.svg';
import {useState} from 'react';

const PinturaModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const [enabled, setEnabled] = useState(false);

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Save'
            title=''
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='Advanced image editing'
                icon={<Icon className='h-12 w-12' />}
                title='Pintura'
            />
            <div className='mt-7'>
                <div className='mb-7 flex items-stretch justify-between gap-4 rounded-sm bg-grey-75 p-7'>
                    <div className='basis-1/2'>
                        <p className='mb-4 font-bold'>Add advanced image editing to Ghost, with Pintura</p>
                        <p className='mb-4 text-sm'>Pintura is a powerful JavaScript image editor that allows you to crop, rotate, annotate and modify images directly inside Ghost.</p>
                        <p className='text-sm'>Try a demo, purchase a license, and download the required CSS/JS files from pqina.nl/pintura/ to activate this feature.</p>
                    </div>
                    <div className='flex grow basis-1/2 flex-col items-end justify-between'>
                        <img alt='Pintura screenshot' src={pinturaScreenshot} />
                        <a className='-mb-1 text-sm font-bold text-green' href="https://pqina.nl/pintura/?ref=ghost.org" rel="noopener noreferrer" target="_blank">Find out more &rarr;</a>
                    </div>
                </div>
                <Form marginBottom={false} title='Pintura configuration' grouped>
                    <Toggle
                        direction='rtl'
                        hint={<>Enable <a className='text-green' href="https://pqina.nl/pintura/?ref=ghost.org" rel="noopener noreferrer" target="_blank">Pintura</a> for editing your images in Ghost</>}
                        label='Enable Pintura'
                        onChange={(e) => {
                            setEnabled(e.target.checked);
                        }}
                    />
                    {enabled && (
                        <>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <div>Upload Pintura script</div>
                                    <div className='text-xs text-grey-600'>Upload the <code>pintura-umd.js</code> file from the Pintura package</div>
                                </div>
                                <Button color='outline' label='Upload' />
                            </div>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <div>Upload Pintura styles</div>
                                    <div className='text-xs text-grey-600'>Upload the <code>pintura.css</code> file from the Pintura package</div>
                                </div>
                                <Button color='outline' label='Upload' />
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </Modal>
    );
});

export default PinturaModal;
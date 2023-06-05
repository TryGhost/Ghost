import Button from './Button';
import React from 'react';
import {ShowToastProps, showToast} from './Toast';

const ToastContainer: React.FC<ShowToastProps> = ({...props}) => {
    return (
        <>
            <Button color='black' label='Toast me!' onClick={() => {
                showToast({...props});
            }} />
        </>
    );
};

export default ToastContainer;
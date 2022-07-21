import React, {useContext, useState} from 'react';
import AppContext from '../../AppContext';

const AddNameDialog = (props) => {
    const {dispatchAction} = useContext(AppContext);

    const close = () => {
        dispatchAction('closePopup');
    };

    const submit = async () => {
        await dispatchAction('updateMemberName', {
            name
        });
        props.callback();
        close();
    };

    const [name, setName] = useState('');
    return (
        <>
            <h1 className="font-sans font-bold tracking-tight text-[24px] mb-3 text-black">Add context to your comment</h1>
            <p className="font-sans text-[1.45rem] text-neutral-500 px-8 leading-9">For a healthy discussion, let other members know who you are when commenting.</p>
            <section className="mt-8 text-left">
                <label htmlFor="comments-name" className="block font-sans font-medium text-sm mb-2">Name</label>
                <input
                    id="comments-name"
                    className="font-sans px-3 rounded border border-neutral-200 focus:border-neutral-300 w-full outline-0 h-[42px] flex items-center"
                    type="text"
                    name="name"
                    value={name}
                    placeholder="Jamie Larson"
                    autoFocus={true}
                    onChange={(e) => {
                        setName(e.target.value);
                    }}
                    // onKeyDown={e => onKeyDown(e, name)}
                    // onBlur={e => onBlur(e, name)}
                    maxLength="64"
                />
                <button
                    className="transition duration-200 ease-linear w-full h-[44px] mt-4 px-8 flex items-center justify-center rounded-md text-white font-sans font-semibold text-[15px] bg-blue-700"
                    onClick={submit}
                >
                    Save
                </button>
            </section>
        </>
    );
};

export default AddNameDialog;

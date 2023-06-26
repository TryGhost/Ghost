import {useAppContext} from '../../../AppContext';

const AuthorContextMenu = ({comment, close, toggleEdit}) => {
    const {dispatchAction} = useAppContext();

    const deleteComment = (event) => {
        dispatchAction('deleteComment', comment);
        close();
    };

    return (
        <div className="flex flex-col">
            <button className="mb-3 w-full text-left text-[14px]" data-testid="edit" type="button" onClick={toggleEdit}>
                Edit
            </button>
            <button className="w-full text-left text-[14px] text-red-600" type="button" onClick={deleteComment}>
                Delete
            </button>
        </div>
    );
};

export default AuthorContextMenu;

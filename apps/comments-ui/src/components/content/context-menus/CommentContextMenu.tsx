import AdminContextMenu from './AdminContextMenu';
import AuthorContextMenu from './AuthorContextMenu';
import NotAuthorContextMenu from './NotAuthorContextMenu';
import {Comment, useAppContext} from '../../../AppContext';
import {useEffect, useRef} from 'react';

type Props = {
    comment: Comment;
    close: () => void;
    toggleEdit: () => void;
};
const CommentContextMenu: React.FC<Props> = ({comment, close, toggleEdit}) => {
    const {member, admin} = useAppContext();
    const isAuthor = member && comment.member?.uuid === member?.uuid;
    const isAdmin = !!admin;
    const element = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const listener = () => {
            close();
        };

        // We need to listen for the window outside the iframe, and also the iframe window events
        window.addEventListener('click', listener, {passive: true});
        const el = element.current?.ownerDocument?.defaultView;

        if (el && el !== window) {
            el.addEventListener('click', listener, {passive: true});
        }

        return () => {
            window.removeEventListener('click', listener, {passive: true} as any);
            if (el && el !== window) {
                el.removeEventListener('click', listener, {passive: true} as any);
            }
        };
    }, [close]);

    useEffect(() => {
        const listener = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
            }
        };
        // For keydown, we only need to listen to the main window, because we pass the events
        // manually in the Iframe component
        window.addEventListener('keydown', listener, {passive: true});

        return () => {
            window.removeEventListener('keydown', listener, {passive: true} as any);
        };
    }, [close]);

    // Prevent closing the context menu when clicking inside of it
    const stopPropagation = (event: React.SyntheticEvent) => {
        event.stopPropagation();
    };

    let contextMenu = null;
    if (comment.status === 'published') {
        if (isAuthor) {
            contextMenu = <AuthorContextMenu close={close} comment={comment} toggleEdit={toggleEdit} />;
        } else {
            if (isAdmin) {
                contextMenu = <AdminContextMenu close={close} comment={comment}/>;
            } else {
                contextMenu = <NotAuthorContextMenu close={close} comment={comment}/>;
            }
        }
    } else {
        if (isAdmin) {
            contextMenu = <AdminContextMenu close={close} comment={comment}/>;
        } else {
            return null;
        }
    }

    return (
        <div ref={element} onClick={stopPropagation}>
            <div className="absolute z-10 min-w-min whitespace-nowrap rounded bg-white py-3 pl-4 pr-8 font-sans text-sm shadow-lg outline-0 dark:bg-zinc-900 dark:text-white sm:min-w-[150px]">
                {contextMenu}
            </div>
        </div>
    );
};

export default CommentContextMenu;

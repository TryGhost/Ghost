import React from 'react';
import {ReactComponent as GhostFavicon} from './icons/ghost-favicon.svg';
import {Link} from 'react-router-dom';

function EditorLink({editorType}) {
    return (
        <Link rel="nofollow ugc noopener noreferrer" to={editorType?.url}>
            <span className="ml-[.7rem] hidden font-normal hover:font-bold group-hover:inline">/ {editorType?.name}</span>
        </Link>
    );
}

const Watermark = ({editorType}) => {
    if (!editorType) {
        return (
            <a className="absolute bottom-4 left-6 z-20 flex items-center rounded bg-white py-1 pr-2 pl-1 font-mono text-sm tracking-tight text-black" href="https://github.com/TryGhost/Koenig/tree/main/packages/koenig-lexical" rel="nofollow ugc noopener noreferrer" target="_blank">
                <GhostFavicon className="mr-2 h-6 w-6" />
                <span className="pr-1 font-bold tracking-wide">Koenig</span>
            editor
            </a>
        );
    }
    const editorTypes = [
        {
            name: 'full',
            url: '/'
        },
        {
            name: 'basic',
            url: '/basic'
        },
        {
            name: 'minimal',
            url: '/minimal'
        }
    ];

    const remainingEditorTypes = editorTypes.filter(type => type.name !== editorType);
    const editorLinks = remainingEditorTypes.map(type => <EditorLink key={type?.name} editorType={type} />);

    return (
        <>
            <div className="group absolute bottom-4 left-6 z-20 flex items-center rounded bg-white py-1 pr-2 pl-1 font-mono text-sm tracking-tight text-black">
                <GhostFavicon className="mr-2 h-6 w-6" />
                <span className="pr-1 font-bold tracking-wide">Koenig</span>
                <span className="group-hover:font-bold">{editorType}
                    {editorLinks}
                </span>
            </div>
        </>
    );
};

export default Watermark;

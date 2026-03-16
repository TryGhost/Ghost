import {useState} from 'react';

interface Snippet {
    name: string;
    value: string;
}

function getSnippetsFromStorage(): Snippet[] {
    const snippetsStr = localStorage.getItem('snippets');
    return snippetsStr ? JSON.parse(snippetsStr) : [];
}

function updateSnippetsInStorage(snippetsArr: Snippet[] = []) {
    localStorage.setItem('snippets', JSON.stringify(snippetsArr));
}

export const useSnippets = () => {
    const [snippets, setSnippets] = useState<Snippet[]>(getSnippetsFromStorage());
    function createSnippet({name, value}: Snippet) {
        const updatedSnippets = [...snippets];
        const snippetIndexForReplace = snippets.findIndex((item: Snippet) => item.name === name);
        if (snippetIndexForReplace === -1) {
            updatedSnippets.push({name, value});
        } else {
            updatedSnippets[snippetIndexForReplace].value = value;
        }

        setSnippets(updatedSnippets);
        updateSnippetsInStorage(updatedSnippets);
    }

    function deleteSnippet(snippet: {name: string}) {
        const updatedSnippets = snippets.filter((item: Snippet) => item.name !== snippet.name);
        setSnippets(updatedSnippets);
        updateSnippetsInStorage(updatedSnippets);
    }

    return {
        createSnippet,
        deleteSnippet,
        snippets
    };
};

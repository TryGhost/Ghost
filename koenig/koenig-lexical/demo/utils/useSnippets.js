import {useState} from 'react';

function getSnippetsFromStorage() {
    const snippetsStr = localStorage.getItem('snippets');

    return snippetsStr ? JSON.parse(snippetsStr) : [];
}

function updateSnippetsInStorage(snippetsArr = []) {
    localStorage.setItem('snippets', JSON.stringify(snippetsArr));
}

export const useSnippets = () => {
    const [snippets, setSnippets] = useState(getSnippetsFromStorage());

    function createSnippet({name, value}) {
        const updatedSnippets = [...snippets];
        const snippetIndexForReplace = snippets.findIndex(item => item.name === name);
        if (snippetIndexForReplace === -1) {
            updatedSnippets.push({name, value});
        } else {
            updatedSnippets[snippetIndexForReplace].value = value;
        }

        setSnippets(updatedSnippets);
        updateSnippetsInStorage(updatedSnippets);
    }

    function deleteSnippet(snippet) {
        const updatedSnippets = snippets.filter(item => item.name !== snippet.name);
        setSnippets(updatedSnippets);
        updateSnippetsInStorage(updatedSnippets);
    }

    return {
        createSnippet,
        deleteSnippet,
        snippets
    };
};

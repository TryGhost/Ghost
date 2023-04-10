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

    function createSnippet(name, value) {
        const updatedSnippets = [...snippets];
        updatedSnippets.push({name, value});

        setSnippets(updatedSnippets);
        updateSnippetsInStorage(updatedSnippets);
    }

    function deleteSnippet(name) {
        const updatedSnippets = snippets.filter(item => item.name !== name);
        setSnippets(updatedSnippets);
        updateSnippetsInStorage(updatedSnippets);
    }

    return {
        createSnippet,
        deleteSnippet,
        snippets
    };
};

**To get the contents of a folder in an AWS CodeCommit repository**

The following ``get-folder`` example demonstrates how to get the contents of a top-level folder from a repository named ``MyDemoRepo``. ::

    aws codecommit get-folder --repository-name MyDemoRepo --folder-path ""

Output::

    {
        "commitId":"c5709475EXAMPLE",
        "files":[
            {
                "absolutePath":".gitignore",
                "blobId":"74094e8bEXAMPLE",
                "fileMode":"NORMAL",
                "relativePath":".gitignore"
            },
            {
                "absolutePath":"Gemfile",
                "blobId":"9ceb72f6EXAMPLE",
                "fileMode":"NORMAL",
                "relativePath":"Gemfile"
            },
            {
                "absolutePath":"Gemfile.lock",
                "blobId":"795c4a2aEXAMPLE",
                "fileMode":"NORMAL",
                "relativePath":"Gemfile.lock"
            },
            {
                "absolutePath":"LICENSE.txt",
                "blobId":"0c7932c8EXAMPLE",
                "fileMode":"NORMAL",
                "relativePath":"LICENSE.txt"
            },
            {
                "absolutePath":"README.md",
                "blobId":"559b44feEXAMPLE",
                "fileMode":"NORMAL",
                "relativePath":"README.md"
            }
        ],
        "folderPath":"",
        "subFolders":[
            {
                "absolutePath":"public",
                "relativePath":"public",
                "treeId":"d5e92ae3aEXAMPLE"
            },
            {
                "absolutePath":"tmp",
                "relativePath":"tmp",
                "treeId":"d564d0bcEXAMPLE"
            }
        ],
        "subModules":[],
        "symbolicLinks":[],
        "treeId":"7b3c4dadEXAMPLE"
    }

For more information, see `GetFolder`_ in the *AWS CodeCommit API Reference* guide.

.. _`GetFolder`: https://docs.aws.amazon.com/codecommit/latest/APIReference/API_GetFolder.html

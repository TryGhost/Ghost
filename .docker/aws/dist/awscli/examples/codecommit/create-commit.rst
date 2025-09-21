**To create a commit**

The following ``create-commit`` example demonstrates how to create an initial commit for a repository that adds a ``readme.md`` file to a repository named ``MyDemoRepo`` in the ``main`` branch. ::

    aws codecommit create-commit \
        --repository-name MyDemoRepo \
        --branch-name main \
        --put-files "filePath=readme.md,fileContent='Welcome to our team repository.'"

Output::

    {
        "filesAdded": [
            {
                "blobId": "5e1c309d-EXAMPLE",
                "absolutePath": "readme.md",
                "fileMode": "NORMAL"
            }
        ],
        "commitId": "4df8b524-EXAMPLE",
        "treeId": "55b57003-EXAMPLE",
        "filesDeleted": [],
        "filesUpdated": []
    }

For more information, see `Create a Commit in AWS CodeCommit <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-create-commit.html#how-to-create-commit-cli>`__ in the *AWS CodeCommit User Guide*.
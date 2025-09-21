**To delete a file**

The following ``delete-file`` example demonstrates how to delete a file named ``README.md`` from a branch named ``main`` with a most recent commit ID of ``c5709475EXAMPLE`` in a repository named ``MyDemoRepo``. ::

    aws codecommit delete-file \
        --repository-name MyDemoRepo \
        --branch-name main \
        --file-path README.md \
        --parent-commit-id c5709475EXAMPLE

Output::

    {
        "blobId":"559b44fEXAMPLE",
        "commitId":"353cf655EXAMPLE",
        "filePath":"README.md",
        "treeId":"6bc824cEXAMPLE"
    }

For more information, see `Edit or Delete a File in AWS CodeCommit <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-edit-file.html?shortFooter=true#how-to-edit-file-cli>`__ in the *AWS CodeCommit API Reference* guide.
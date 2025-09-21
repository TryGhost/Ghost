**To get the base-64 encoded contents of a file in an AWS CodeCommit repository**

The following ``get-file`` example demonstrates how to get the base-64 encoded contents of a file named ``README.md`` from a branch named ``main`` in a repository named ``MyDemoRepo``. ::

    aws codecommit get-file \
        --repository-name MyDemoRepo \
        --commit-specifier main \
        --file-path README.md

Output::

    {
        "blobId":"559b44fEXAMPLE",
        "commitId":"c5709475EXAMPLE",
        "fileContent":"IyBQaHVzEXAMPLE",
        "filePath":"README.md",
        "fileMode":"NORMAL",
        "fileSize":1563
    }

For more information, see `GetFile <https://docs.aws.amazon.com/codecommit/latest/APIReference/API_GetFile.html>`__ in the *AWS CodeCommit API Reference* guide.

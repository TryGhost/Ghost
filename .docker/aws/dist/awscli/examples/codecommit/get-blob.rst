**To view information about a Git blob object**

The following ``get-blob`` example retrieves information about a Git blob with the ID of '2eb4af3bEXAMPLE' in an AWS CodeCommit repository named 'MyDemoRepo'. ::

    aws codecommit get-blob  --repository-name MyDemoRepo  --blob-id 2eb4af3bEXAMPLE

Output::

    {
        "content": "QSBCaW5hcnkgTGFyToEXAMPLE="
    }

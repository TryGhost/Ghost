**To view whether there are any merge conflicts for a pull request**

The following ``get-merge-conflicts`` example displays whether there are any merge conflicts between the tip of a source branch named ``feature-randomizationfeature`` and a destination branch named 'main' in a repository named ``MyDemoRepo``. ::

    aws codecommit get-merge-conflicts \
        --repository-name MyDemoRepo \
        --source-commit-specifier feature-randomizationfeature \
        --destination-commit-specifier main \
        --merge-option THREE_WAY_MERGE

Output::

    {
        "mergeable": false,
        "destinationCommitId": "86958e0aEXAMPLE",
        "sourceCommitId": "6ccd57fdEXAMPLE",
        "baseCommitId": "767b6958EXAMPLE",
        "conflictMetadataList": [
            {
                "filePath": "readme.md",
                "fileSizes": {
                    "source": 139,
                    "destination": 230,
                    "base": 85
                },
                "fileModes": {
                    "source": "NORMAL",
                    "destination": "NORMAL",
                    "base": "NORMAL"
                },
                "objectTypes": {
                    "source": "FILE",
                    "destination": "FILE",
                    "base": "FILE"
                },
                "numberOfConflicts": 1,
                "isBinaryFile": {
                    "source": false,
                    "destination": false,
                    "base": false
                },
                "contentConflict": true,
                "fileModeConflict": false,
                "objectTypeConflict": false,
                "mergeOperations": {
                    "source": "M",
                    "destination": "M"
                }
            }
        ]
    }

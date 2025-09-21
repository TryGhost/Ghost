**To get information about merge conflicts in all files or a subset of files in a merge between two commit specifiers**

The following ``batch-describe-merge-conflicts`` example determines the merge conflicts for merging a source branch named ``feature-randomizationfeature`` with a destination branch named ``main`` using the ``THREE_WAY_MERGE`` strategy in a repository named ``MyDemoRepo``. ::

    aws codecommit batch-describe-merge-conflicts \
        --source-commit-specifier feature-randomizationfeature \
        --destination-commit-specifier main \
        --merge-option THREE_WAY_MERGE \
        --repository-name MyDemoRepo

Output::

    {
        "conflicts": [
            {
                "conflictMetadata": {
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
                },
                "mergeHunks": [
                    {
                        "isConflict": true,
                        "source": {
                            "startLine": 0,
                            "endLine": 3,
                            "hunkContent": "VGhpcyBpEXAMPLE=="
                        },
                        "destination": {
                            "startLine": 0,
                            "endLine": 1,
                            "hunkContent": "VXNlIHRoEXAMPLE="
                        }
                    }
                ]
            }
        ],
        "errors": [],
        "destinationCommitId": "86958e0aEXAMPLE",
        "sourceCommitId": "6ccd57fdEXAMPLE",
        "baseCommitId": "767b6958EXAMPLE"
    }

For more information, see `Resolve Conflicts in a Pull Request <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-resolve-conflict-pull-request.html#batch-describe-merge-conflicts>`__ in the *AWS CodeCommit User Guide*.
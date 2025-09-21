**To get detailed information about merge conflicts**

The following ``describe-merge-conflicts`` example determines the merge conflicts for a file named ``readme.md`` in the specified source branch and destination branch using the THREE_WAY_MERGE strategy. ::

    aws codecommit describe-merge-conflicts \
        --source-commit-specifier feature-randomizationfeature \
        --destination-commit-specifier main \
        --merge-option THREE_WAY_MERGE \
        --file-path readme.md \
        --repository-name MyDemoRepo

Output::

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
                    "hunkContent": "VGhpcyBpEXAMPLE="
                },
                "destination": {
                    "startLine": 0,
                    "endLine": 1,
                    "hunkContent": "VXNlIHRoEXAMPLE="
                }
            }
        ],
        "destinationCommitId": "86958e0aEXAMPLE",
        "sourceCommitId": "6ccd57fdEXAMPLE",
        "baseCommitId": "767b69580EXAMPLE"
    }

For more information, see `Resolve Conflicts in a Pull Request <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-resolve-conflict-pull-request.html#describe-merge-conflicts>`__ in the *AWS CodeCommit User Guide*.

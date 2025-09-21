**To get information about the merge options available for merging two specified branches**

The following ``get-merge-options`` example determines the merge options available for merging a source branch named ``bugfix-bug1234`` with a destination branch named ``main`` in a repository named ``MyDemoRepo``. ::

    aws codecommit get-merge-options \
        --source-commit-specifier bugfix-bug1234 \
        --destination-commit-specifier main \
        --repository-name MyDemoRepo

Output::

    {
        "mergeOptions": [
            "FAST_FORWARD_MERGE",
            "SQUASH_MERGE",
            "THREE_WAY_MERGE"
        ],
        "sourceCommitId": "18059494EXAMPLE",
        "destinationCommitId": "ffd3311dEXAMPLE",
        "baseCommitId": "ffd3311dEXAMPLE"
    } 

For more information, see `Resolve Conflicts in a Pull Request <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-resolve-conflict-pull-request.html#get-merge-options>`__ in the *AWS CodeCommit User Guide*.

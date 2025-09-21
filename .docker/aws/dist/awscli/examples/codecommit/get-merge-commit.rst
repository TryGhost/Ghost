**To get detailed information about a merge commit**

The following ``get-merge-commit`` example displays details about a merge commit for the source branch named ``bugfix-bug1234`` with a destination branch named ``main`` in a repository named ``MyDemoRepo``. ::

    aws codecommit get-merge-commit \
        --source-commit-specifier bugfix-bug1234 \
        --destination-commit-specifier main \
        --repository-name MyDemoRepo

Output::

    {
        "sourceCommitId": "c5709475EXAMPLE", 
        "destinationCommitId": "317f8570EXAMPLE", 
        "baseCommitId": "fb12a539EXAMPLE",
        "mergeCommitId": "ffc4d608eEXAMPLE"
    }

For more information, see `View Commit Details <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-view-commit-details.html#how-to-view-commit-details-cli-merge-commit>`__ in the *AWS CodeCommit User Guide*.

**To merge two branches using the squash merge strategy**

The following ``merge-branches-by-squash`` example merges the specified source branch with the specified destination branch in a repository named ``MyDemoRepo``. ::

    aws codecommit merge-branches-by-squash \
        --source-commit-specifier bugfix-bug1234 \
        --destination-commit-specifier bugfix-bug1233 \
        --author-name "Maria Garcia" \
        --email "maria_garcia@example.com" \
        --commit-message "Merging two fix branches to prepare for a general patch." \
        --repository-name MyDemoRepo

Output::

    {
        "commitId": "4f178133EXAMPLE",
        "treeId": "389765daEXAMPLE"
    }


For more information, see `Compare and Merge Branches <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-compare-branches.html#merge-branches-by-squash>`__ in the *AWS CodeCommit User Guide*.

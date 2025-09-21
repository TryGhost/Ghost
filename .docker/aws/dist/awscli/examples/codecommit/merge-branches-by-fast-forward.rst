**To merge two branches using the fast-forward merge strategy**

The following ``merge-branches-by-fast-forward`` example merges the specified source branch with the specified destination branch in a repository named ``MyDemoRepo``. ::

    aws codecommit merge-branches-by-fast-forward \
        --source-commit-specifier bugfix-bug1234 \
        --destination-commit-specifier bugfix-bug1233 \
        --repository-name MyDemoRepo

Output::

    {
        "commitId": "4f178133EXAMPLE",
        "treeId": "389765daEXAMPLE"
    }

For more information, see `Compare and Merge Branches <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-compare-branches.html#merge-branches-by-fast-forward>`__ in the *AWS CodeCommit User Guide*.

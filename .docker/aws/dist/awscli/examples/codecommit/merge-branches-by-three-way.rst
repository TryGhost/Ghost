**To merge two branches using the three-way merge strategy**

The following ``merge-branches-by-three-way`` example merges the specified source branch with the specified destination branch in a repository named ``MyDemoRepo``. ::

    aws codecommit merge-branches-by-three-way \
        --source-commit-specifier main \
        --destination-commit-specifier bugfix-bug1234 \
        --author-name "Jorge Souza" --email "jorge_souza@example.com" \
        --commit-message "Merging changes from main to bugfix branch before additional testing." \
        --repository-name MyDemoRepo

Output::

    {
        "commitId": "4f178133EXAMPLE",
        "treeId": "389765daEXAMPLE"
    }

For more information, see `Compare and Merge Branches <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-compare-branches.html#merge-branches-by-three-way>`__ in the *AWS CodeCommit User Guide*.

**To create an unreferenced commit that represents the result of merging two commit specifiers**

The following ``create-unreferenced-merge-commit`` example creates a commit that represents the results of a merge between a source branch named ``bugfix-1234`` with a destination branch named ``main`` using the THREE_WAY_MERGE strategy in a repository named ``MyDemoRepo``. ::

    aws codecommit create-unreferenced-merge-commit \
        --source-commit-specifier bugfix-1234 \
        --destination-commit-specifier main \
        --merge-option THREE_WAY_MERGE \
        --repository-name MyDemoRepo \
        --name "Maria Garcia" \
        --email "maria_garcia@example.com" \
        --commit-message "Testing the results of this merge."

Output::

    {
        "commitId": "4f178133EXAMPLE",
        "treeId": "389765daEXAMPLE"
    }

For more information, see `Resolve Conflicts in a Pull Request <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-resolve-conflict-pull-request.html#batch-describe-merge-conflicts>`__ in the *AWS CodeCommit User Guide*.

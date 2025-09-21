**To view information about multiple commits**

The following ``batch-get-commits`` example displays details about the specified commits. ::

    aws codecommit batch-get-commits  \
        --repository-name MyDemoRepo  \
        --commit-ids 317f8570EXAMPLE 4c925148EXAMPLE

Output::

    {
        "commits": [
          {
            "additionalData": "",
            "committer": {
                "date": "1508280564 -0800",
                "name": "Mary Major",
                "email": "mary_major@example.com"
            },
            "author": {
                "date": "1508280564 -0800",
                "name": "Mary Major",
                "email": "mary_major@example.com"
            },
            "commitId": "317f8570EXAMPLE",
            "treeId": "1f330709EXAMPLE",
            "parents": [
                "6e147360EXAMPLE"
            ],
            "message": "Change variable name and add new response element"
        },
        {
            "additionalData": "",
            "committer": {
                "date": "1508280542 -0800",
                "name": "Li Juan",
                "email": "li_juan@example.com"
            },
            "author": {
                "date": "1508280542 -0800",
                "name": "Li Juan",
                "email": "li_juan@example.com"
            },
            "commitId": "4c925148EXAMPLE",
            "treeId": "1f330709EXAMPLE",
            "parents": [
                "317f8570EXAMPLE"
            ],
            "message": "Added new class"
        }   
    }


For more information, see `View Commit Details <https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-view-commit-details.html#how-to-view-commit-details-cli-batch-get-commits>`__ in the *AWS CodeCommit User Guide*.

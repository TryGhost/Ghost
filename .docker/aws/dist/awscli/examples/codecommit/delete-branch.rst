**To delete a branch**

This example shows how to delete a branch in an AWS CodeCommit repository.

Command::

  aws codecommit delete-branch --repository-name MyDemoRepo --branch-name MyNewBranch

Output::

  {
    "branch": {
        "commitId": "317f8570EXAMPLE",
        "branchName": "MyNewBranch"
    }
  }
**To get information about a branch**

This example gets information about a branch in an AWS CodeCommit repository.

Command::

  aws codecommit get-branch --repository-name MyDemoRepo --branch-name MyNewBranch

Output::

  {
    "BranchInfo": {
          "commitID": "317f8570EXAMPLE",
		  "branchName": "MyNewBranch"
    }
  }

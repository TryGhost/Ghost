**To create a repository**

This example creates a repository and associates it with the user's AWS account.

Command::

  aws codecommit create-repository --repository-name MyDemoRepo --repository-description "My demonstration repository"

Output::

  {
      "repositoryMetadata": {
          "repositoryName": "MyDemoRepo",
		  "cloneUrlSsh": "ssh://git-codecommit.us-east-1.amazonaws.com/v1/repos/MyDemoRepo",
		  "lastModifiedDate": 1444766838.027,
          "repositoryDescription": "My demonstration repository",
		  "cloneUrlHttp": "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/MyDemoRepo",
          "repositoryId": "f7579e13-b83e-4027-aaef-650c0EXAMPLE",
		  "Arn": "arn:aws:codecommit:us-east-1:111111111111EXAMPLE:MyDemoRepo",
          "accountId": "111111111111"
      }
  }
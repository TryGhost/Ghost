**To view a list of pull requests in a repository**

This example demonstrates how to list pull requests created by an IAM user with the ARN 'arn:aws:iam::111111111111:user/Li_Juan' and the status of 'CLOSED' in an AWS CodeCommit repository named 'MyDemoRepo'::

  aws codecommit list-pull-requests --author-arn arn:aws:iam::111111111111:user/Li_Juan --pull-request-status CLOSED --repository-name MyDemoRepo 

Output::

  {
   "nextToken": "",
   "pullRequestIds": ["2","12","16","22","23","35","30","39","47"]
  }
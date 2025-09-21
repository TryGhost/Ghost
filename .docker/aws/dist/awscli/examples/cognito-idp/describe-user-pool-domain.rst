**To describe a user pool client**

This example describes a user pool domain named my-domain. 

Command::

  aws cognito-idp describe-user-pool-domain --domain my-domain

Output::

  {
    "DomainDescription": {
        "UserPoolId": "us-west-2_aaaaaaaaa",
        "AWSAccountId": "111111111111",
        "Domain": "my-domain",
        "S3Bucket": "aws-cognito-prod-pdx-assets",
        "CloudFrontDistribution": "aaaaaaaaaaaaa.cloudfront.net",
        "Version": "20190128175402",
        "Status": "ACTIVE",
        "CustomDomainConfig": {}
    }
  }
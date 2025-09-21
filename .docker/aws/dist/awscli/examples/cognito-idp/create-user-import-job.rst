**To create a user import job**

This example creates a user import job named MyImportJob. 

For more information about importing users, see `Importing Users into User Pools From a CSV File`_.

Command::

  aws cognito-idp create-user-import-job --user-pool-id us-west-2_aaaaaaaaa --job-name MyImportJob --cloud-watch-logs-role-arn arn:aws:iam::111111111111:role/CognitoCloudWatchLogsRole 

Output::

  {
    "UserImportJob": {
        "JobName": "MyImportJob",
        "JobId": "import-qQ0DCt2fRh",
        "UserPoolId": "us-west-2_aaaaaaaaa",
        "PreSignedUrl": "PRE_SIGNED_URL",
        "CreationDate": 1548271795.471,
        "Status": "Created",
        "CloudWatchLogsRoleArn": "arn:aws:iam::111111111111:role/CognitoCloudWatchLogsRole",
        "ImportedUsers": 0,
        "SkippedUsers": 0,
        "FailedUsers": 0
    }
  }
  
Upload the .csv file with curl using the pre-signed URL:

Command::

  curl -v -T "PATH_TO_CSV_FILE" -H "x-amz-server-side-encryption:aws:kms" "PRE_SIGNED_URL"


.. _`Importing Users into User Pools From a CSV File`: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-using-import-tool.html
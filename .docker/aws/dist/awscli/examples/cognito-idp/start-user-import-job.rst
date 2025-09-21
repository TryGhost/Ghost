**To start an import job**

The following ``start-user-import-job`` example starts the requested import job in the requested user pool. ::

    aws cognito-idp start-user-import-job \
        --user-pool-id us-west-2_EXAMPLE \
        --job-id import-mAgUtd8PMm

Output::

    {
        "UserImportJob": {
            "CloudWatchLogsRoleArn": "arn:aws:iam::123456789012:role/example-cloudwatch-logs-role",
            "CreationDate": 1736442975.904,
            "FailedUsers": 0,
            "ImportedUsers": 0,
            "JobId": "import-mAgUtd8PMm",
            "JobName": "Customer import",
            "PreSignedUrl": "https://aws-cognito-idp-user-import-pdx.s3.us-west-2.amazonaws.com/123456789012/us-west-2_EXAMPLE/import-mAgUtd8PMm?X-Amz-Security-Token=[token]&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20241226T193341Z&X-Amz-SignedHeaders=host%3Bx-amz-server-side-encryption&X-Amz-Expires=899&X-Amz-Credential=[credential]&X-Amz-Signature=[signature]",
            "SkippedUsers": 0,
            "StartDate": 1736443020.081,
            "Status": "Pending",
            "UserPoolId": "us-west-2_EXAMPLE"
        }
    }

For more information, see `Importing users into a user pool <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-using-import-tool.html>`__ in the *Amazon Cognito Developer Guide*.
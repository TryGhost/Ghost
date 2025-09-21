**To list user import jobs and statuses**

The following ``list-user-import-jobs`` example lists first three user import jobs and their details in the requested user pool. ::

    aws cognito-idp list-user-import-jobs \
        --user-pool-id us-west-2_EXAMPLE \
        --max-results 3

Output::

    {
        "PaginationToken": "us-west-2_EXAMPLE#import-example3#1667948397084",
        "UserImportJobs": [
            {
                "CloudWatchLogsRoleArn": "arn:aws:iam::123456789012:role/service-role/Cognito-UserImport-Role",
                "CompletionDate": 1735329786.142,
                "CompletionMessage": "The user import job has expired.",
                "CreationDate": 1735241621.022,
                "FailedUsers": 0,
                "ImportedUsers": 0,
                "JobId": "import-example1",
                "JobName": "Test-import-job-1",
                "PreSignedUrl": "https://aws-cognito-idp-user-import-pdx.s3.us-west-2.amazonaws.com/123456789012/us-west-2_EXAMPLE/import-mAgUtd8PMm?X-Amz-Security-Token=[token]&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20241226T193341Z&X-Amz-SignedHeaders=host%3Bx-amz-server-side-encryption&X-Amz-Expires=899&X-Amz-Credential=[credential]&X-Amz-Signature=[signature]",
                "SkippedUsers": 0,
                "Status": "Expired",
                "UserPoolId": "us-west-2_EXAMPLE"
            },
            {
                "CloudWatchLogsRoleArn": "arn:aws:iam::123456789012:role/service-role/Cognito-UserImport-Role",
                "CompletionDate": 1681509058.408,
                "CompletionMessage": "Too many users have failed or been skipped during the import.",
                "CreationDate": 1681509001.477,
                "FailedUsers": 1,
                "ImportedUsers": 0,
                "JobId": "import-example2",
                "JobName": "Test-import-job-2",
                "PreSignedUrl": "https://aws-cognito-idp-user-import-pdx.s3.us-west-2.amazonaws.com/123456789012/us-west-2_EXAMPLE/import-mAgUtd8PMm?X-Amz-Security-Token=[token]&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20241226T193341Z&X-Amz-SignedHeaders=host%3Bx-amz-server-side-encryption&X-Amz-Expires=899&X-Amz-Credential=[credential]&X-Amz-Signature=[signature]",
                "SkippedUsers": 0,
                "StartDate": 1681509057.965,
                "Status": "Failed",
                "UserPoolId": "us-west-2_EXAMPLE"
            },
            {
                "CloudWatchLogsRoleArn": "arn:aws:iam::123456789012:role/service-role/Cognito-UserImport-Role",
                "CompletionDate": 1.667864578676E9,
                "CompletionMessage": "Import Job Completed Successfully.",
                "CreationDate": 1.667864480281E9,
                "FailedUsers": 0,
                "ImportedUsers": 6,
                "JobId": "import-example3",
                "JobName": "Test-import-job-3",
                "PreSignedUrl": "https://aws-cognito-idp-user-import-pdx.s3.us-west-2.amazonaws.com/123456789012/us-west-2_EXAMPLE/import-mAgUtd8PMm?X-Amz-Security-Token=[token]&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20241226T193341Z&X-Amz-SignedHeaders=host%3Bx-amz-server-side-encryption&X-Amz-Expires=899&X-Amz-Credential=[credential]&X-Amz-Signature=[signature]",
                "SkippedUsers": 0,
                "StartDate": 1.667864578167E9,
                "Status": "Succeeded",
                "UserPoolId": "us-west-2_EXAMPLE"
            }
        ]
    }

For more information, see `Importing users from a CSV file <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-using-import-tool.html>`__ in the *Amazon Cognito Developer Guide*.

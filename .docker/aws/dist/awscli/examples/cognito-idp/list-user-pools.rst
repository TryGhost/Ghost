**To list user pools**

The following ``list-user-pools`` example lists 3 of the available user pools in the AWS account of the current CLI credentials. ::

    aws cognito-idp list-user-pools \
        --max-results 3

Output::

    {
        "NextToken": "[Pagination token]",
        "UserPools": [
            {
                "CreationDate": 1681502497.741,
                "Id": "us-west-2_EXAMPLE1",
                "LambdaConfig": {
                    "CustomMessage": "arn:aws:lambda:us-east-1:123456789012:function:MyFunction",
                    "PreSignUp": "arn:aws:lambda:us-east-1:123456789012:function:MyFunction",
                    "PreTokenGeneration": "arn:aws:lambda:us-east-1:123456789012:function:MyFunction",
                    "PreTokenGenerationConfig": {
                        "LambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:MyFunction",
                        "LambdaVersion": "V1_0"
                    }
                },
                "LastModifiedDate": 1681502497.741,
                "Name": "user pool 1"
            },
            {
                "CreationDate": 1686064178.717,
                "Id": "us-west-2_EXAMPLE2",
                "LambdaConfig": {
                },
                "LastModifiedDate": 1686064178.873,
                "Name": "user pool 2"
            },
            {
                "CreationDate": 1627681712.237,
                "Id": "us-west-2_EXAMPLE3",
                "LambdaConfig": {
                    "UserMigration": "arn:aws:lambda:us-east-1:123456789012:function:MyFunction"
                },
                "LastModifiedDate": 1678486942.479,
                "Name": "user pool 3"
            }
        ]
    }

For more information, see `Amazon Cognito user pools <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html>`__ in the *Amazon Cognito Developer Guide*.

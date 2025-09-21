**To retrieve the details of a secret**

The following ``describe-secret`` example shows the details of a secret. ::

    aws secretsmanager describe-secret \
        --secret-id MyTestSecret 

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-Ca8JGt",
        "Name": "MyTestSecret",
        "Description": "My test secret",
        "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/EXAMPLE1-90ab-cdef-fedc-ba987EXAMPLE",
        "RotationEnabled": true,
        "RotationLambdaARN": "arn:aws:lambda:us-west-2:123456789012:function:MyTestRotationLambda",
        "RotationRules": {
            "AutomaticallyAfterDays": 2,
            "Duration": "2h",
            "ScheduleExpression": "cron(0 16 1,15 * ? *)"
        },
        "LastRotatedDate": 1525747253.72,
        "LastChangedDate": 1523477145.729,
        "LastAccessedDate": 1524572133.25,
        "Tags": [
            {
                "Key": "SecondTag",
                "Value": "AnotherValue"
            },
            {
                "Key": "FirstTag",
                "Value": "SomeValue"
            }
        ],
        "VersionIdsToStages": {
            "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111": [
                "AWSPREVIOUS"
            ],
            "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222": [
                "AWSCURRENT"
            ],
            "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333": [
                "AWSPENDING"
            ]
        },
        "CreatedDate": 1521534252.66,
        "PrimaryRegion": "us-west-2",
        "ReplicationStatus": [
            {
                "Region": "eu-west-3",
                "KmsKeyId": "alias/aws/secretsmanager",
                "Status": "InSync",
                "StatusMessage": "Replication succeeded"
            }
        ]
    }

For more information, see `Secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/getting-started.html#term_secret>`__ in the *Secrets Manager User Guide*.
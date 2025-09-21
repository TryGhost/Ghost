**To view the grants on an AWS KMS key**

The following ``list-grants`` example displays all of the grants on the specified AWS managed KMS key for Amazon DynamoDB in your account. This grant allows DynamoDB to use the KMS key on your behalf to encrypt a DynamoDB table before writing it to disk. You can use a command like this one to view the grants on the AWS managed KMS keys and customer managed KMS keys in the AWS account and Region.

This command uses the ``key-id`` parameter with a key ID to identify the KMS key. You can use a key ID or key ARN to identify the KMS key. To get the key ID or key ARN of an AWS managed KMS key, use the ``list-keys`` or ``list-aliases`` command. ::

    aws kms list-grants \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab

The output shows that the grant gives Amazon DynamoDB permission to use the KMS key for cryptographic operations, and gives it permission to view details about the KMS key (``DescribeKey``) and to retire grants (``RetireGrant``). The ``EncryptionContextSubset`` constraint limits these permission to requests that include the specified encryption context pairs. As a result, the permissions in the grant are effective only on specified account and DynamoDB table. ::

    {
        "Grants": [
            {
                "Constraints": {
                    "EncryptionContextSubset": {
                        "aws:dynamodb:subscriberId": "123456789012",
                        "aws:dynamodb:tableName": "Services"
                    }
                },
                "IssuingAccount": "arn:aws:iam::123456789012:root",
                "Name": "8276b9a6-6cf0-46f1-b2f0-7993a7f8c89a",
                "Operations": [
                    "Decrypt",
                    "Encrypt",
                    "GenerateDataKey",
                    "ReEncryptFrom",
                    "ReEncryptTo",
                    "RetireGrant",
                    "DescribeKey"
                ],
                "GrantId": "1667b97d27cf748cf05b487217dd4179526c949d14fb3903858e25193253fe59",
                "KeyId": "arn:aws:kms:us-west-2:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab",
                "RetiringPrincipal": "dynamodb.us-west-2.amazonaws.com",
                "GranteePrincipal": "dynamodb.us-west-2.amazonaws.com",
                "CreationDate": "2021-05-13T18:32:45.144000+00:00"
            }
        ]
    }

For more information, see `Grants in AWS KMS <https://docs.aws.amazon.com/kms/latest/developerguide/grants.html>`__ in the *AWS Key Management Service Developer Guide*.

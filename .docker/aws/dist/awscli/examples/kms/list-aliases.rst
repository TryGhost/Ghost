**Example 1: To list all aliases in an AWS account and Region**

The following example uses the ``list-aliases`` command to list all aliases in the default Region of the AWS account. The output includes aliases associated with AWS managed KMS keys and customer managed KMS keys. ::

    aws kms list-aliases

Output::

    {
        "Aliases": [
            {
                "AliasArn": "arn:aws:kms:us-west-2:111122223333:alias/testKey",
                "AliasName": "alias/testKey",
                "TargetKeyId": "1234abcd-12ab-34cd-56ef-1234567890ab"
            },
            {
                "AliasArn": "arn:aws:kms:us-west-2:111122223333:alias/FinanceDept",
                "AliasName": "alias/FinanceDept",
                "TargetKeyId": "0987dcba-09fe-87dc-65ba-ab0987654321"
            },
            {
                "AliasArn": "arn:aws:kms:us-west-2:111122223333:alias/aws/dynamodb",
                "AliasName": "alias/aws/dynamodb",
                "TargetKeyId": "1a2b3c4d-5e6f-1a2b-3c4d-5e6f1a2b3c4d"
            },
            {
                "AliasArn": "arn:aws:kms:us-west-2:111122223333:alias/aws/ebs",
                "AliasName": "alias/aws/ebs",
                "TargetKeyId": "0987ab65-43cd-21ef-09ab-87654321cdef"
            },
            ...
        ]
    }

**Example 2: To list all aliases for a particular KMS key**

The following example uses the ``list-aliases`` command and its ``key-id`` parameter to list all aliases that are associated with a particular KMS key.

Each alias is associated with only one KMS key, but a KMS key can have multiple aliases. This command is very useful because the AWS KMS console lists only one alias for each KMS key. To find all aliases for a KMS key, you must use the ``list-aliases`` command.

This example uses the key ID of the KMS key for the ``--key-id`` parameter, but you can use a key ID, key ARN, alias name, or alias ARN in this command. ::

    aws kms list-aliases --key-id 1234abcd-12ab-34cd-56ef-1234567890ab

Output::

    {
        "Aliases": [
            {
                "TargetKeyId": "1234abcd-12ab-34cd-56ef-1234567890ab",
                "AliasArn": "arn:aws:kms:us-west-2:111122223333:alias/oregon-test-key",
                "AliasName": "alias/oregon-test-key"
            },
            {
                "TargetKeyId": "1234abcd-12ab-34cd-56ef-1234567890ab",
                "AliasArn": "arn:aws:kms:us-west-2:111122223333:alias/project121-test",
                "AliasName": "alias/project121-test"
            }
        ]
    }

For more information, see `Working with Aliases <https://docs.aws.amazon.com/kms/latest/developerguide/programming-aliases.html>`__ in the *AWS Key Management Service Developer Guide*.
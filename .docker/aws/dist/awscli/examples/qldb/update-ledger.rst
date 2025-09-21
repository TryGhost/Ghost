**Example 1: To update the deletion protection property of a ledger**

The following ``update-ledger`` example updates the specified ledger to disable the deletion protection feature. ::

    aws qldb update-ledger \
        --name myExampleLedger \
        --no-deletion-protection

Output::

    {
        "CreationDateTime": 1568839243.951,
        "Arn": "arn:aws:qldb:us-west-2:123456789012:ledger/myExampleLedger",
        "DeletionProtection": false,
        "Name": "myExampleLedger",
        "State": "ACTIVE"
    }

**Example 2: To update the AWS KMS key of a ledger to a customer managed key**

The following ``update-ledger`` example updates the specified ledger to use a customer managed KMS key for encryption at rest. ::

    aws qldb update-ledger \
        --name myExampleLedger \
        --kms-key arn:aws:kms:us-west-2:123456789012:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "CreationDateTime": 1568839243.951,
        "Arn": "arn:aws:qldb:us-west-2:123456789012:ledger/myExampleLedger",
        "DeletionProtection": false,
        "Name": "myExampleLedger",
        "State": "ACTIVE",
        "EncryptionDescription": { 
            "KmsKeyArn": "arn:aws:kms:us-west-2:123456789012:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "EncryptionStatus": "UPDATING"
        }
    }

**Example 3: To update the AWS KMS key of a ledger to an AWS owned key**

The following ``update-ledger`` example updates the specified ledger to use an AWS owned KMS key for encryption at rest. ::

    aws qldb update-ledger \
        --name myExampleLedger \
        --kms-key AWS_OWNED_KMS_KEY

Output::

    {
        "CreationDateTime": 1568839243.951,
        "Arn": "arn:aws:qldb:us-west-2:123456789012:ledger/myExampleLedger",
        "DeletionProtection": false,
        "Name": "myExampleLedger",
        "State": "ACTIVE",
        "EncryptionDescription": {
            "KmsKeyArn": "AWS_OWNED_KMS_KEY",
            "EncryptionStatus": "UPDATING"
        }
    }

For more information, see `Basic Operations for Amazon QLDB Ledgers <https://docs.aws.amazon.com/qldb/latest/developerguide/ledger-management.basics.html>`__ in the *Amazon QLDB Developer Guide*.
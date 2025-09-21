**Example 1: To create a ledger with default properties**

The following ``create-ledger`` example creates a ledger with the name ``myExampleLedger`` and the permissions mode ``STANDARD``. The optional parameters for deletion protection and AWS KMS key are not specified, so they default to ``true`` and an AWS owned KMS key respectively. ::

    aws qldb create-ledger \
        --name myExampleLedger \
        --permissions-mode STANDARD

Output::

    {
        "State": "CREATING",
        "Arn": "arn:aws:qldb:us-west-2:123456789012:ledger/myExampleLedger",
        "DeletionProtection": true,
        "CreationDateTime": 1568839243.951,
        "Name": "myExampleLedger",
        "PermissionsMode": "STANDARD"
    }

**Example 2: To create a ledger with deletion protection disabled, a customer managed KMS key, and specified tags**

The following ``create-ledger`` example creates a ledger with the name ``myExampleLedger2`` and the permissions mode ``STANDARD``. The deletion protection feature is disabled, the specified customer managed KMS key is used for encryption at rest, and the specified tags are attached to the resource. ::

    aws qldb create-ledger \
        --name myExampleLedger2 \
        --permissions-mode STANDARD \
        --no-deletion-protection \
        --kms-key arn:aws:kms:us-west-2:123456789012:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --tags IsTest=true,Domain=Test

Output::

    {
        "Arn": "arn:aws:qldb:us-west-2:123456789012:ledger/myExampleLedger2",
        "DeletionProtection": false,
        "CreationDateTime": 1568839543.557,
        "State": "CREATING",
        "Name": "myExampleLedger2",
        "PermissionsMode": "STANDARD",
        "KmsKeyArn": "arn:aws:kms:us-west-2:123456789012:key/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Basic Operations for Amazon QLDB Ledgers <https://docs.aws.amazon.com/qldb/latest/developerguide/ledger-management.basics.html>`__ in the *Amazon QLDB Developer Guide*.
**Example 1: To update the permissions mode of a ledger to STANDARD**

The following ``update-ledger-permissions-mode`` example assigns the ``STANDARD`` permissions mode to the specified ledger. ::

    aws qldb update-ledger-permissions-mode \
        --name myExampleLedger \
        --permissions-mode STANDARD

Output::

    {
        "Name": "myExampleLedger",
        "Arn": "arn:aws:qldb:us-west-2:123456789012:ledger/myExampleLedger",
        "PermissionsMode": "STANDARD"
    }

**Example 2: To update the permissions mode of a ledger to ALLOW_ALL**

The following ``update-ledger-permissions-mode`` example assigns the ``ALLOW_ALL`` permissions mode to the specified ledger. ::

    aws qldb update-ledger-permissions-mode \
        --name myExampleLedger \
        --permissions-mode ALLOW_ALL

Output::

    {
        "Name": "myExampleLedger",
        "Arn": "arn:aws:qldb:us-west-2:123456789012:ledger/myExampleLedger",
        "PermissionsMode": "ALLOW_ALL"
    }


For more information, see `Basic Operations for Amazon QLDB Ledgers <https://docs.aws.amazon.com/qldb/latest/developerguide/ledger-management.basics.html>`__ in the *Amazon QLDB Developer Guide*.
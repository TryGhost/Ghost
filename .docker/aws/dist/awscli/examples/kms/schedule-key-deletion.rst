**To schedule the deletion of a customer managed KMS key.**

The following ``schedule-key-deletion`` example schedules the specified customer managed KMS key to be deleted in 15 days.

* The ``--key-id`` parameter identifies the KMS key. This example uses a key ARN value, but you can use either the key ID or the ARN of the KMS key.
* The ``--pending-window-in-days`` parameter specifies the length of the 7-30 day waiting period. By default, the waiting period is 30 days. This example specifies a value of 15, which tells AWS to permanently delete the KMS key 15 days after the command completes. ::

    aws kms schedule-key-deletion \
        --key-id arn:aws:kms:us-west-2:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab \
        --pending-window-in-days 15

The response includes the key ARN, key state, waiting period (``PendingWindowInDays``), and the deletion date in Unix time. To view the deletion date in local time, use the AWS KMS console. 
KMS keys in the ``PendingDeletion`` key state cannot be used in cryptographic operations. ::

    {
        "KeyId": "arn:aws:kms:us-west-2:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "DeletionDate": "2022-06-18T23:43:51.272000+00:00",
        "KeyState": "PendingDeletion",
        "PendingWindowInDays": 15
    }

For more information, see `Deleting keys <https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html>`__ in the *AWS Key Management Service Developer Guide*.
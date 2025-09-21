**To cancel the scheduled deletion of a customer managed KMS key**

The following ``cancel-key-deletion`` example cancels the scheduled deletion of a customer managed KMS key. ::

    aws kms cancel-key-deletion \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab

Output::

    {
        "KeyId": "arn:aws:kms:us-west-2:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab"
    }

When the ``cancel-key-deletion`` command succeeds, the scheduled deletion is canceled. However, the key state of the KMS key is ``Disabled``, so you can't use the KMS key in cryptographic operations. To restore its functionality, use the ``enable-key`` command .

For more information, see `Scheduling and canceling key deletion <https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html#deleting-keys-scheduling-key-deletion>`__ in the *AWS Key Management Service Developer Guide*.
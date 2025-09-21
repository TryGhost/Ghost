**To temporarily disable a KMS key**

The following ``disable-key`` command disables a customer managed KMS key. To re-enable the KMS key, use the ``enable-key`` command. ::

    aws kms disable-key \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab

This command produces no output.

For more information, see `Enabling and Disabling Keys <https://docs.aws.amazon.com/kms/latest/developerguide/enabling-keys.html>`__ in the *AWS Key Management Service Developer Guide*.
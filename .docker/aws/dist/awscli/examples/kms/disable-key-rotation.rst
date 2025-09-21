**To disable automatic rotation of a KMS key**

The following ``disable-key-rotation`` example disables automatic rotation of a customer managed KMS key. To reenable automatic rotation, use the ``enable-key-rotation`` command. ::

    aws kms disable-key-rotation \
        --key-id arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab

This command produces no output. To verify that automatic rotation is disable for the KMS key, use the ``get-key-rotation-status`` command.

For more information, see `Rotating keys <https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html>`__ in the *AWS Key Management Service Developer Guide*.
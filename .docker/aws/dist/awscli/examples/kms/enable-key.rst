**To enable a KMS key**

The following ``enable-key`` example enables a customer managed key. You can use a command like this one to enable a KMS key that you temporarily disabled by using the ``disable-key`` command. You can also use it to enable a KMS key that is disabled because it was scheduled for deletion and the deletion was canceled. 

To specify the KMS key, use the ``key-id`` parameter. This example uses an key ID value, but you can use a key ID or key ARN value in this command.

Before running this command, replace the example key ID with a valid one. ::

    aws kms enable-key \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab

This command produces no output. To verify that the KMS key is enabled, use the ``describe-key`` command. See the values of the ``KeyState`` and ``Enabled`` fields in the ``describe-key`` output.

For more information, see `Enabling and Disabling Keys <https://docs.aws.amazon.com/kms/latest/developerguide/enabling-keys.html>`__ in the *AWS Key Management Service Developer Guide*.
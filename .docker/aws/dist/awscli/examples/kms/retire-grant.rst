**To retire a grant on a customer master key**

The following ``retire-grant`` example deletes a grant from a KMS key. 

The following example command specifies the ``grant-id`` and the ``key-id`` parameters. The value of the ``key-id`` parameter must be the key ARN of the KMS key. ::

    aws kms retire-grant \
        --grant-id 1234a2345b8a4e350500d432bccf8ecd6506710e1391880c4f7f7140160c9af3 \
        --key-id arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab

This command produces no output. To confirm that the grant was retired, use the ``list-grants`` command.

For more information, see `Retiring and revoking grants <https://docs.aws.amazon.com/kms/latest/developerguide/grant-manage.html#grant-delete>`__ in the *AWS Key Management Service Developer Guide*.
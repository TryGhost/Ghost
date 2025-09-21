**To associate an alias with a different KMS key**

The following ``update-alias`` example associates the alias ``alias/test-key`` with a different KMS key.

* The ``--alias-name`` parameter specifies the alias. The alias name value must begin with ``alias/``. 
* The ``--target-key-id`` parameter specifies the KMS key to associate with the alias. You don't need to specify the current KMS key for the alias. ::

    aws kms update-alias \
        --alias-name alias/test-key \
        --target-key-id 1234abcd-12ab-34cd-56ef-1234567890ab

This command produces no output. To find the alias, use the ``list-aliases`` command.

For more information, see `Updating aliases <https://docs.aws.amazon.com/kms/latest/developerguide/alias-manage.html#alias-update>`__ in the *AWS Key Management Service Developer Guide*.
**To create an alias for a KMS key**

The following ``create-alias`` command creates an alias named ``example-alias`` for the KMS key identified by key ID ``1234abcd-12ab-34cd-56ef-1234567890ab``.

Alias names must begin with ``alias/``. Do not use alias names that begin with ``alias/aws``; these are reserved for use by AWS. ::

    aws kms create-alias \
        --alias-name alias/example-alias \
        --target-key-id 1234abcd-12ab-34cd-56ef-1234567890ab

This command doesn't return any output. To see the new alias, use the ``list-aliases`` command. 

For more information, see `Using aliases <https://docs.aws.amazon.com/kms/latest/developerguide/kms-alias.html>`__ in the *AWS Key Management Service Developer Guide*.

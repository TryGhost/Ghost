**To delete a custom key store**

The following ``delete-custom-key-store`` example deletes the specified custom key store. 

Deleting an AWS CloudHSM key store has no effect on the associated CloudHSM cluster. Deleting an external key store has no effect on the associated external key store proxy, external key manager, or external keys.

**NOTE:** Before you can delete a custom key store, you must schedule the deletion of all KMS keys in the custom key store and then wait for those KMS keys to be deleted. Then, you must disconnect the custom key store. 
For help finding the KMS keys in your custom key store, see `Delete an AWS CloudHSM key store (API) <https://docs.aws.amazon.com/kms/latest/developerguide/delete-keystore.html#delete-keystore-api>`__ in the *AWS Key Management Service Developer Guide*. ::

    delete-custom-key-store \
        --custom-key-store-id cks-1234567890abcdef0

This command does not return any output. To verify that the custom key store is deleted, use the ``describe-custom-key-stores`` command.

For information about deleting an AWS CloudHSM key stores, see `Deleting an AWS CloudHSM key store <https://docs.aws.amazon.com/kms/latest/developerguide/delete-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

For information about deleting external key stores, see `Deleting an external key store <https://docs.aws.amazon.com/kms/latest/developerguide/delete-xks.html>`__ in the *AWS Key Management Service Developer Guide*.
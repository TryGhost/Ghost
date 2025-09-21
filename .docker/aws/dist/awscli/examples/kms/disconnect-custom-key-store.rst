**To disconnect a custom key store**

The following ``disconnect-custom-key-store`` example disconnects a custom key store from its AWS CloudHSM cluster. You might disconnect a key store to troubleshoot a problem, to update its settings, or to prevent KMS keys in the keystore from being used in cryptographic operations.

This command is the same for all custom key stores, including AWS CloudHSM key stores and external key stores.

Before running this command, replace the example custom key store ID with a valid one. ::

    $ aws kms disconnect-custom-key-store \
        --custom-key-store-id cks-1234567890abcdef0

This command produces no output.  verify that the command was effective, use the ``describe-custom-key-stores`` command.

For more information about disconnecting an AWS CloudHSM key store, see `Connecting and disconnecting an AWS CloudHSM key store <https://docs.aws.amazon.com/kms/latest/developerguide/disconnect-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

For more information about disconnecting an external key store, see `Connecting and disconnecting an external key store <https://docs.aws.amazon.com/kms/latest/developerguide/xks-connect-disconnect.html>`__ in the *AWS Key Management Service Developer Guide*.
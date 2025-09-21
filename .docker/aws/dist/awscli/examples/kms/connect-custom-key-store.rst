**To connect a custom key store**

The following ``connect-custom-key-store`` example reconnects the specified custom key store. You can use a command like this one to connect a custom key store for the first time or to reconnect a key store that was disconnected. 

You can use this command to connect an AWS CloudHSM key store or an external key store. ::

    aws kms connect-custom-key-store \
        --custom-key-store-id cks-1234567890abcdef0

This command does not return any output. To verify that the command was effective, use the ``describe-custom-key-stores`` command.

For information about connecting an AWS CloudHSM key store, see `Connecting and disconnecting an AWS CloudHSM key store <https://docs.aws.amazon.com/kms/latest/developerguide/disconnect-keystore.html>`__ in the *AWS Key Management Service Developer Guide*.

For information about connecting an external key store, see `Connecting and disconnecting an external key store <https://docs.aws.amazon.com/kms/latest/developerguide/xks-connect-disconnect.html>`__ in the *AWS Key Management Service Developer Guide*.
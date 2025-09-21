**To complete an in-progress vault lock process**

The following ``complete-vault-lock`` example completes the in-progress locking progress for the specified vault and sets the lock state of the vault lock to ``Locked``. You get the value for the ``lock-id`` parameter when you run ``initiate-lock-process``. ::

    aws glacier complete-vault-lock \
        --account-id - \
        --vault-name MyVaultName \
        --lock-id 9QZgEXAMPLEPhvL6xEXAMPLE

This command produces no output.

For more information, see `Complete Vault Lock (POST lockId) <https://docs.aws.amazon.com/amazonglacier/latest/dev/api-CompleteVaultLock.html>`__ in the *Amazon Glacier API Developer Guide*.

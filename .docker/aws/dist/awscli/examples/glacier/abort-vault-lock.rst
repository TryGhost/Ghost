**To abort an in-progress vault lock process**

The following ``abort-vault-lock`` example deletes a vault lock policy from the specified vault and resets the lock state of the vault lock to unlocked. ::

    aws glacier abort-vault-lock \
        --account-id - \
        --vault-name MyVaultName

This command produces no output.

For more information, see `Abort Vault Lock (DELETE lock-policy) <https://docs.aws.amazon.com/amazonglacier/latest/dev/api-AbortVaultLock.html>`__ in the *Amazon Glacier API Developer Guide*.

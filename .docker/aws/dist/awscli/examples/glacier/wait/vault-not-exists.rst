**To pause until a vault no longer exists**

The following ``wait vault-not-exists`` example pauses running and continues only after it confirms that the specified vault doesn't exist. ::

    aws glacier wait vault-not-exists \
        --account-id 111122223333 \
        --vault-name example_vault

This command produces no output.

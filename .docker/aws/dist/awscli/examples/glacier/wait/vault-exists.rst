**To pause until a vault exists***

The following ``wait vault-exists`` example pauses running and continues only after it confirms that the specified vault exists. ::

    aws glacier wait vault-exists \
        --account-id 111122223333 \
        --vault-name example_vault

This command produces no output.

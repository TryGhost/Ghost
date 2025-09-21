**To remove the access policy of a vault**

The following ``delete-vault-access-policy`` example removes the access policy for the specified vault. ::

    aws glacier delete-vault-access-policy \
        --account-id 111122223333 \
        --vault-name example_vault

This command produces no output.

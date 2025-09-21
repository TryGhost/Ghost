**To remove the SNS notifications for a vault**

The following ``delete-vault-notifications`` example removes notifications sent by Amazon Simple Notification Service (Amazon SNS) for the specified vault. ::

    aws glacier delete-vault-notifications \
        --account-id 111122223333 \
        --vault-name example_vault

This command produces no output.

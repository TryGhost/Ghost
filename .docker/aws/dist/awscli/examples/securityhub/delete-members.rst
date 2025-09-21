**To delete member accounts**

The following ``delete-members`` example deletes the specified member accounts from the requesting administrator account. ::

    aws securityhub delete-members \
        --account-ids "123456789111" "123456789222"

Output::

    {
        "UnprocessedAccounts": []
    }

For more information, see `Managing administrator and member accounts <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts.html>`__ in the *AWS Security Hub User Guide*.

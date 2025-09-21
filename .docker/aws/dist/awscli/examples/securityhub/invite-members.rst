**To send invitations to member accounts**

The following ``invite-members`` example sends invitations to the specified member accounts. ::

    aws securityhub invite-members \
        --account-ids "123456789111" "123456789222"

Output::

    {
        "UnprocessedAccounts": []
    }

For more information, see `Managing administrator and member accounts <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts.html>`__ in the *AWS Security Hub User Guide*.

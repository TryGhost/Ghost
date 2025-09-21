**To decline an invitation to be a member account**

The following ``decline-invitations`` example declines an invitation to be a member account of the specified administrator account. The member account is the requesting account. ::

    aws securityhub decline-invitations \
        --account-ids "123456789012"

Output::

    {
        "UnprocessedAccounts": []
    }


For more information, see `Managing administrator and member accounts <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts.html>`__ in the *AWS Security Hub User Guide*.

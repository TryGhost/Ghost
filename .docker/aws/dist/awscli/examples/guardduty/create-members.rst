**To associate a new member with your GuardDuty master account in the current region.**

This example shows how to associate member accounts to be managed by the current account as the GuardDuty master. ::

    aws guardduty create-members
        --detector-id b6b992d6d2f48e64bc59180bfexample \
        --account-details AccountId=111122223333,Email=first+member@example.com AccountId=111111111111 ,Email=another+member@example.com

Output::

    {
       "UnprocessedAccounts": []
    }

For more information, see `Managing multiple accounts <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_accounts.html>`__ in the GuardDuty User Guide.
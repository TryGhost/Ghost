**To list information about the delegated administrator account of your organization**

The following ``list-delegated-admin-accounts`` example lists information about the delegated administrator account of your organization. ::

    aws inspector2 list-delegated-admin-accounts

Output::

    {
        "delegatedAdminAccounts": [
            {
                "accountId": "123456789012",
                "status": "ENABLED"
            }
        ]
    }

For more information, see `Designating a delegated administrator for Amazon Inspector <https://docs.aws.amazon.com/inspector/latest/user/admin-member-relationship.html>`__ in the *Amazon Inspector User Guide*.

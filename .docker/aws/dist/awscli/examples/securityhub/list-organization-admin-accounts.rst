**To list the designated Security Hub administrator accounts**

The following ``list-organization-admin-accounts`` example lists the Security Hub administrator accounts for an organization. ::

    aws securityhub list-organization-admin-accounts 

Output::

    {
        AdminAccounts": [
            { "AccountId": "777788889999" },
            { "Status": "ENABLED" }
        ]
    }

For more information, see `Designating a Security Hub administrator account <https://docs.aws.amazon.com/securityhub/latest/userguide/designate-orgs-admin-account.html>`__ in the *AWS Security Hub User Guide*.

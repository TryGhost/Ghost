**Example: To get member information for your organization**

    aws inspector2 get-member \
        --account-id 123456789012

Output::

    {
            "member": {
            "accountId": "123456789012",
            "delegatedAdminAccountId": "123456789012",
            "relationshipStatus": "ENABLED",
            "updatedAt": "2023-09-11T09:57:20.520000-07:00"
        }
    }

For more information, see `Managing multiple accounts in Amazon Inspector with AWS Organizations <https://docs.aws.amazon.com/inspector/latest/user/managing-multiple-accounts.html>`__ in the *Amazon Inspector User Guide*.

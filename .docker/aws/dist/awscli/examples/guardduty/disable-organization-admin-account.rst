**To remove an account as the delegated administrator for GuardDuty within your organization**

This example shows how to remove an account as the delegated administrator for GuardDuty. ::

    aws guardduty disable-organization-admin-account \
        --admin-account-id 111122223333

This command produces no output.

For more information, see `Managing accounts with AWS organizations <https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html>`__ in the *GuardDuty User Guide*.
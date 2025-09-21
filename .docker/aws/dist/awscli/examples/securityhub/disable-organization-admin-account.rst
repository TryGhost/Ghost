**To remove a Security Hub administrator account**

The following ``disable-organization-admin-account`` example revokes the specified account's assignment as a Security Hub administrator account for AWS Organizations. ::

    aws securityhub disable-organization-admin-account \
        --admin-account-id 777788889999

This command produces no output.

For more information, see `Designating a Security Hub administrator account <https://docs.aws.amazon.com/securityhub/latest/userguide/designate-orgs-admin-account.html>`__ in the *AWS Security Hub User Guide*.

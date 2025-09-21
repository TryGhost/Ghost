**To view how Security Hub is configured for an organization**

The following ``describe-organization-configuration`` example returns information about the way an organization is configured in Security Hub. In this example, the organization uses central configuration. Only the Security Hub administrator account can run this command. ::

    aws securityhub describe-organization-configuration

Output::

    {
        "AutoEnable": false,
        "MemberAccountLimitReached": false,
        "AutoEnableStandards": "NONE",
        "OrganizationConfiguration": {
            "ConfigurationType": "LOCAL",
            "Status": "ENABLED",
            "StatusMessage": "Central configuration has been enabled successfully"
        }
    }

For more information, see `Managing accounts with AWS Organizations <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts-orgs.html>`__ in the *AWS Security Hub User Guide*.
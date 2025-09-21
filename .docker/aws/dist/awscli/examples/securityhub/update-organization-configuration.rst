**To update how Security Hub is configured for an organization**

The following ``update-organization-configuration`` example specifies that Security Hub should use central configuration to configure an organization. After running this command, the delegated Security Hub administrator can create and manage configuration policies to configure the organization. The delegated administrator can also use this command to switch from central to local configuration. If local configuration is the configuration type, the delegated administrator can choose whether to automatically enable Security Hub and default security standards in new organization accounts. ::

    aws securityhub update-organization-configuration \
        --no-auto-enable \
        --organization-configuration '{"ConfigurationType": "CENTRAL"}'

This command produces no output.

For more information, see `Managing accounts with AWS Organizations <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts-orgs.html>`__ in the *AWS Security Hub User Guide*.
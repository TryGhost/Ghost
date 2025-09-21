**To stop automatic source collection in member accounts**

The following ``delete-data-lake-organization-configuration`` example stops the automatic collection of AWS Security Hub findings from new member accounts that join the organization. Only the delegated Security Lake administrator can run this command. It prevents new member accounts from automatically contributing data to the data lake. ::

    aws securitylake delete-data-lake-organization-configuration \
        --auto-enable-new-account '[{"region":"us-east-1","sources":[{"sourceName":"SH_FINDINGS"}]}]'

This command produces no output.

For more information, see `Managing multiple accounts with AWS Organizations <https://docs.aws.amazon.com/securityhub/latest/userguide/multi-account-management.html>`__ in the *Amazon Security Lake User Guide*.

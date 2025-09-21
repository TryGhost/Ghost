**To configure Security Lake in new organization accounts**

The following ``create-data-lake-organization-configuration`` example enables Security Lake and the collection of the specified source events and logs in new organization accounts. ::

    aws securitylake create-data-lake-organization-configuration \
        --auto-enable-new-account '[{"region":"us-east-1","sources":[{"sourceName":"SH_FINDINGS","sourceVersion": "1.0"}]}]'

This command produces no output.

For more information, see `Managing multiple accounts with AWS Organizations <https://docs.aws.amazon.com/security-lake/latest/userguide/multi-account-management.html>`__ in the *Amazon Security Lake User Guide*.
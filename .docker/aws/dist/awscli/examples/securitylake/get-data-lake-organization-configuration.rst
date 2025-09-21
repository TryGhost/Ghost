**To get details about the configuration for new organization accounts**

The following ``get-data-lake-organization-configuration`` example retrieves details about the source logs that new organization accounts will send after onboarding to Amazon Security Lake. ::

    aws securitylake get-data-lake-organization-configuration 

Output::

    {
        "autoEnableNewAccount": [
            {
                "region": "us-east-1",
                "sources": [
                    {
                        "sourceName": "VPC_FLOW",
                        "sourceVersion": "1.0"
                    },
                    {
                        "sourceName": "ROUTE53",
                        "sourceVersion": "1.0"
                    },
                    {
                        "sourceName": "SH_FINDINGS",
                        "sourceVersion": "1.0"
                    }
                ]
            }
        ]
    }

For more information, see `Managing multiple accounts with AWS Organizations <https://docs.aws.amazon.com/security-lake/latest/userguide/multi-account-management.html>`__ in the *Amazon Security Lake User Guide*.

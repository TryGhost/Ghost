**To get the status of log collection**

The following ``get-data-lake-sources`` example gets a snapshot of log collection for the specified account in the current AWS Region. The account has Amazon Security Lake enabled. ::

    aws securitylake get-data-lake-sources \
        --accounts "123456789012" 

Output::

    {
        "dataLakeSources": [
            {
                "account": "123456789012",
                "sourceName": "SH_FINDINGS",
                "sourceStatuses": [
                    {
                        "resource": "vpc-1234567890abcdef0",
                        "status": "COLLECTING"
                    }
                ]
            },
            {
                "account": "123456789012",
                "sourceName": "VPC_FLOW",
                "sourceStatuses": [
                    {
                        "resource": "vpc-1234567890abcdef0",
                        "status": "NOT_COLLECTING"
                    }
                ]
            },
            {
                "account": "123456789012",
                "sourceName": "LAMBDA_EXECUTION",
                "sourceStatuses": [
                    {
                        "resource": "vpc-1234567890abcdef0",
                        "status": "COLLECTING"
                    }
                ]
            },
            {
                "account": "123456789012",
                "sourceName": "ROUTE53",
                "sourceStatuses": [
                    {
                        "resource": "vpc-1234567890abcdef0",
                        "status": "COLLECTING"
                    }
                ]
            },
            {
                "account": "123456789012",
                "sourceName": "CLOUD_TRAIL_MGMT",
                "sourceStatuses": [
                    {
                        "resource": "vpc-1234567890abcdef0",
                        "status": "COLLECTING"
                    }
                ]
            }
        ],
        "dataLakeArn": null
    }

For more information, see `Collecting data from AWS services <https://docs.aws.amazon.com/security-lake/latest/userguide/internal-sources.html>`__ in the *Amazon Security Lake User Guide*.

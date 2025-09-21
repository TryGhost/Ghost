**To retrieve the Amazon Security Lake log sources**

The following ``list-log-sources`` example lists the Amazon Security Lake log sources in a specified account. ::

    aws securitylake list-log-sources \
        --accounts "123456789012"

Output::

    {
        "account": "123456789012",
        "region": "xy-region-1",
        "sources": [
            {
                   "awsLogSource": {
                    "sourceName": "VPC_FLOW",
                    "sourceVersion": "2.0"
                }
            },
            {
                "awsLogSource": {
                    "sourceName": "SH_FINDINGS",
                    "sourceVersion": "2.0"
                }
            }
        ]
    }

For more information, see `Source management <https://docs.aws.amazon.com/security-lake/latest/userguide/source-management.html>`__ in the *Amazon Security Lake User Guide*.
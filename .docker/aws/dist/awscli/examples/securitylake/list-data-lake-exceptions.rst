**To list the issues affecting your data lake**

The following ``list-data-lake-exceptions`` example lists the issues that are affecting your data lake in the last 14 days in the specified AWS Regions. ::

    aws securitylake list-data-lake-exceptions \
        --regions "us-east-1" "eu-west-3" 

Output::

    {
        "exceptions": [
            {
                "exception": "The account does not have the required role permissions. Update your role permissions to use the new data source version.",
                "region": "us-east-1",
                "timestamp": "2024-02-29T12:24:15.641725+00:00"
            },
            {
                "exception": "The account does not have the required role permissions. Update your role permissions to use the new data source version.",
                "region": "eu-west-3",
                "timestamp": "2024-02-29T12:24:15.641725+00:00"
            }
        ]
    }

For more information, see `Troubleshooting Amazon Security Lake <https://docs.aws.amazon.com/security-lake/latest/userguide/security-lake-troubleshoot.html#securitylake-data-lake-troubleshoot>`__ in the *Amazon Security Lake User Guide*.

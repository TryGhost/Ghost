**To remove a natively-supported AWS service.**

The following ``delete-aws-logsource`` example deletes VPC Flow Logs as a Security Lake source in the designated accounts and Regions. ::

    aws securitylake delete-aws-log-source \
        --sources '[{"regions": ["us-east-1"], "accounts": ["123456789012"], "sourceName": "SH_FINDINGS", "sourceVersion": "2.0"}]'

Output::

    {
        "failed": [
            "123456789012"
        ]
    }

For more information, see `Removing an AWS service as a source <https://docs.aws.amazon.com/security-lake/latest/userguide/internal-sources.html#remove-internal-sources>`__ in the *Amazon Security Lake User Guide*.
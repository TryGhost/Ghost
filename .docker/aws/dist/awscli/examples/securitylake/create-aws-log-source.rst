**To add a natively supported Amazon Web Service as an Amazon Security Lake source**

The following ``create-aws-logsource`` example adds VPC Flow Logs as a Security Lake source in the designated accounts and Regions. ::

    aws securitylake create-aws-log-source \
        --sources '[{"regions": ["us-east-1"], "accounts": ["123456789012"], "sourceName": "SH_FINDINGS", "sourceVersion": "2.0"}]'

Output::

    {
        "failed": [
            "123456789012"
        ]
    }

For more information, see `Adding an AWS service as a source <https://docs.aws.amazon.com/security-lake/latest/userguide/internal-sources.html#add-internal-sources>`__ in the *Amazon Security Lake User Guide*.
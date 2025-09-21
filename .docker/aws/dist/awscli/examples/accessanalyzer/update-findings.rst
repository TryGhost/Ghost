**To update the status for the specified findings**

The following ``update-findings`` example updates the status for the specified findings in your AWS account. ::

    aws accessanalyzer update-findings \
        --analyzer-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/UnusedAccess-ConsoleAnalyzer-organization \
        --ids 4f319ac3-2e0c-4dc4-bf51-7013a086b6ae 780d586a-2cce-4f72-aff6-359d450e7500 \
        --status ARCHIVED

This command produces no output.

For more information, see `Using AWS Identity and Access Management Access Analyzer <https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html>`__ in the *AWS IAM User Guide*.
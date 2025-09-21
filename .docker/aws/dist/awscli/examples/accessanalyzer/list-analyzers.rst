**To retrieve a list of analyzers**

The following ``list-analyzers`` example retrieves a list of analyzers in your AWS account. ::

    aws accessanalyzer list-analyzers

Output::

    {
        "analyzers": [
            {
                "arn": "arn:aws:access-analyzer:us-west-2:111122223333:analyzer/UnusedAccess-ConsoleAnalyzer-organization",
                "createdAt": "2024-02-15T00:46:40+00:00",
                "name": "UnusedAccess-ConsoleAnalyzer-organization",
                "status": "ACTIVE",
                "tags": {
                    "auto-delete": "no"
                },
                "type": "ORGANIZATION_UNUSED_ACCESS"
            },
            {
                "arn": "arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-organization",
                "createdAt": "2020-04-25T07:43:28+00:00",
                "lastResourceAnalyzed": "arn:aws:s3:::amzn-s3-demo-bucket",
                "lastResourceAnalyzedAt": "2024-02-15T21:51:56.517000+00:00",
                "name": "ConsoleAnalyzer-organization",
                "status": "ACTIVE",
                "tags": {
                    "auto-delete": "no"
                },
                "type": "ORGANIZATION"
            },
            {
                "arn": "arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-account",
                "createdAt": "2019-12-03T07:28:17+00:00",
                "lastResourceAnalyzed": "arn:aws:sns:us-west-2:111122223333:config-topic",
                "lastResourceAnalyzedAt": "2024-02-15T18:01:53.003000+00:00",
                "name": "ConsoleAnalyzer-account",
                "status": "ACTIVE",
                "tags": {
                    "auto-delete": "no"
                },
                "type": "ACCOUNT"
            }
        ]
    }

For more information, see `Using AWS Identity and Access Management Access Analyzer <https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html>`__ in the *AWS IAM User Guide*.
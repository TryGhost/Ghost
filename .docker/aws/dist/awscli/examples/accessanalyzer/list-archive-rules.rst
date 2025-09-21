**To retrieve a list of archive rules created for the specified analyzer**

The following ``list-archive-rules`` example retrieves a list of archive rules created for the specified analyzer in your AWS account. ::

    aws accessanalyzer list-archive-rules \
        --analyzer-name UnusedAccess-ConsoleAnalyzer-organization

Output::

    {
        "archiveRules": [
            {
                "createdAt": "2024-02-15T00:49:27+00:00",
                "filter": {
                    "resource": {
                        "contains": [
                            "Cognito"
                        ]
                    },
                    "resourceType": {
                        "eq": [
                            "AWS::IAM::Role"
                        ]
                    }
                },
                "ruleName": "MyArchiveRule",
                "updatedAt": "2024-02-15T00:49:27+00:00"
            },
            {
                "createdAt": "2024-02-15T23:27:45+00:00",
                "filter": {
                    "findingType": {
                        "eq": [
                            "UnusedIAMUserAccessKey"
                        ]
                    }
                },
                "ruleName": "ArchiveRule-56125a39-e517-4ff8-afb1-ef06f58db612",
                "updatedAt": "2024-02-15T23:27:45+00:00"
            }
        ]
    }

For more information, see `Using AWS Identity and Access Management Access Analyzer <https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html>`__ in the *AWS IAM User Guide*.
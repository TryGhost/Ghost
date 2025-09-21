**To retrieve information about an archive rule**

The following ``get-archive-rule`` example retrieves information about an archive rule in your AWS account. ::

    aws accessanalyzer get-archive-rule \
        --analyzer-name UnusedAccess-ConsoleAnalyzer-organization \
        --rule-name MyArchiveRule

Output::

    {
        "archiveRule": {
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
        }
    }

For more information, see `Archive rules <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-archive-rules.html>`__ in the *AWS IAM User Guide*.
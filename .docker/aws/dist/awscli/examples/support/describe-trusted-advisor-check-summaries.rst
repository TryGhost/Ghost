**To list the summaries of AWS Trusted Advisor checks**

The following ``describe-trusted-advisor-check-summaries`` example lists the results for two Trusted Advisor checks: Amazon S3 Bucket Permissions and IAM Use. ::

    aws support describe-trusted-advisor-check-summaries \
        --check-ids "Pfx0RwqBli" "zXCkfM1nI3"

Output::

    {
        "summaries": [
            {
                "checkId": "Pfx0RwqBli",
                "timestamp": "2020-05-13T21:38:12Z",
                "status": "ok",
                "hasFlaggedResources": true,
                "resourcesSummary": {
                    "resourcesProcessed": 44,
                    "resourcesFlagged": 0,
                    "resourcesIgnored": 0,
                    "resourcesSuppressed": 0
                },
                "categorySpecificSummary": {
                    "costOptimizing": {
                        "estimatedMonthlySavings": 0.0,
                        "estimatedPercentMonthlySavings": 0.0
                    }
                }
            },
            {
                "checkId": "zXCkfM1nI3",
                "timestamp": "2020-05-13T21:38:05Z",
                "status": "ok",
                "hasFlaggedResources": true,
                "resourcesSummary": {
                    "resourcesProcessed": 1,
                    "resourcesFlagged": 0,
                    "resourcesIgnored": 0,
                    "resourcesSuppressed": 0
                },
                "categorySpecificSummary": {
                    "costOptimizing": {
                        "estimatedMonthlySavings": 0.0,
                        "estimatedPercentMonthlySavings": 0.0
                    }
                }
            }
        ]
    }

For more information, see `AWS Trusted Advisor <https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html>`__ in the *AWS Support User Guide*.

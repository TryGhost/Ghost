**To list the results of an AWS Trusted Advisor check**

The following ``describe-trusted-advisor-check-result`` example lists the results of the IAM Use check. ::

    aws support describe-trusted-advisor-check-result \
        --check-id "zXCkfM1nI3"

Output::

    {
        "result": {
            "checkId": "zXCkfM1nI3",
            "timestamp": "2020-05-13T21:38:05Z",
            "status": "ok",
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
            },
            "flaggedResources": [
                {
                    "status": "ok",
                    "resourceId": "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZEXAMPLE",
                    "isSuppressed": false
                }
            ]
        }
    }

For more information, see `AWS Trusted Advisor <https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html>`__ in the *AWS Support User Guide*.

**Example 1: To list recommendations**

The following ``list-recommendations`` example lists all recommendations and does not include a filter. ::

    aws trustedadvisor list-recommendations

Output::

    {
        "recommendationSummaries": [
            {
                "arn": "arn:aws:trustedadvisor::000000000000:recommendation/55fa4d2e-bbb7-491a-833b-5773e9589578",
                "name": "MFA Recommendation",
                "awsServices": [
                    "iam"
                ],
                "checkArn": "arn:aws:trustedadvisor:::check/7DAFEmoDos",
                "id": "55fa4d2e-bbb7-491a-833b-5773e9589578",
                "lastUpdatedAt": "2023-11-01T15:57:58.673Z",
                "pillarSpecificAggregates": {
                    "costOptimizing": {
                        "estimatedMonthlySavings": 0.0,
                        "estimatedPercentMonthlySavings": 0.0
                    }
                },
                "pillars": [
                    "security"
                ],
                "resourcesAggregates": {
                    "errorCount": 1,
                    "okCount": 0,
                    "warningCount": 0
                },
                "source": "ta_check",
                "status": "error",
                "type": "standard"
            },
            {
                "arn": "arn:aws:trustedadvisor::000000000000:recommendation/8b602b6f-452d-4cb2-8a9e-c7650955d9cd",
                "name": "RDS clusters quota warning",
                "awsServices": [
                    "rds"
                ],
                "checkArn": "arn:aws:trustedadvisor:::check/gjqMBn6pjz",
                "id": "8b602b6f-452d-4cb2-8a9e-c7650955d9cd",
                "lastUpdatedAt": "2023-11-01T15:58:17.397Z",
                "pillarSpecificAggregates": {
                    "costOptimizing": {
                        "estimatedMonthlySavings": 0.0,
                        "estimatedPercentMonthlySavings": 0.0
                    }
                },
                "pillars": [
                    "service_limits"
                ],
                "resourcesAggregates": {
                    "errorCount": 0,
                    "okCount": 3,
                    "warningCount": 6
                },
                "source": "ta_check",
                "status": "warning",
                "type": "standard"
            }
        ],
        "nextToken": "REDACTED"
    }

For more information, see `Get started with the Trusted Advisor API <https://docs.aws.amazon.com/awssupport/latest/user/get-started-with-aws-trusted-advisor-api.html>`__ in the *AWS Trusted Advisor User Guide*.

**Example 2: To list recommendations with a filter**

The following ``list-recommendations`` example lists recommendations and includes a filter. ::

    aws trustedadvisor list-recommendations \
        --aws-service iam \
        --max-items 100

Output::

    {
        "recommendationSummaries": [{
            "arn": "arn:aws:trustedadvisor::000000000000:recommendation/55fa4d2e-bbb7-491a-833b-5773e9589578",
            "name": "MFA Recommendation",
            "awsServices": [
                "iam"
            ],
            "checkArn": "arn:aws:trustedadvisor:::check/7DAFEmoDos",
            "id": "55fa4d2e-bbb7-491a-833b-5773e9589578",
            "lastUpdatedAt": "2023-11-01T15:57:58.673Z",
            "pillarSpecificAggregates": {
                "costOptimizing": {
                    "estimatedMonthlySavings": 0.0,
                    "estimatedPercentMonthlySavings": 0.0
                }
            },
            "pillars": [
                "security"
            ],
            "resourcesAggregates": {
                "errorCount": 1,
                "okCount": 0,
                "warningCount": 0
            },
            "source": "ta_check",
            "status": "error",
            "type": "standard"
        }],
        "nextToken": "REDACTED"
    }

For more information, see `Get started with the Trusted Advisor API <https://docs.aws.amazon.com/awssupport/latest/user/get-started-with-aws-trusted-advisor-api.html>`__ in the *AWS Trusted Advisor User Guide*.

**Example 3: To list recommendations with a pagination token**

The following ``list-recommendations`` example uses the "nextToken" returned from a previous request to fetch the next page of filtered Recommendations. ::

    aws trustedadvisor list-recommendations \
        --aws-service rds \
        --max-items 100 \
        --starting-token <next-token>

Output::

    {
        "recommendationSummaries": [{
            "arn": "arn:aws:trustedadvisor::000000000000:recommendation/8b602b6f-452d-4cb2-8a9e-c7650955d9cd",
            "name": "RDS clusters quota warning",
            "awsServices": [
                "rds"
            ],
            "checkArn": "arn:aws:trustedadvisor:::check/gjqMBn6pjz",
            "id": "8b602b6f-452d-4cb2-8a9e-c7650955d9cd",
            "lastUpdatedAt": "2023-11-01T15:58:17.397Z",
            "pillarSpecificAggregates": {
                "costOptimizing": {
                    "estimatedMonthlySavings": 0.0,
                    "estimatedPercentMonthlySavings": 0.0
                }
            },
            "pillars": [
                "service_limits"
            ],
            "resourcesAggregates": {
                "errorCount": 0,
                "okCount": 3,
                "warningCount": 6
            },
            "source": "ta_check",
            "status": "warning",
            "type": "standard"
        }]
    }

For more information, see `Get started with the Trusted Advisor API <https://docs.aws.amazon.com/awssupport/latest/user/get-started-with-aws-trusted-advisor-api.html>`__ in the *AWS Trusted Advisor User Guide*.
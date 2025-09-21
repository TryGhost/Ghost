**To list organization recommendation resources**

The following ``list-organization-recommendation-resources`` example lists all resources for an organization recommendation by its identifier. ::

    aws trustedadvisor list-organization-recommendation-resources \
        --organization-recommendation-identifier arn:aws:trustedadvisor:::organization-recommendation/5a694939-2e54-45a2-ae72-730598fa89d0

Output::

    {
        "organizationRecommendationResourceSummaries": [
            {
                "arn": "arn:aws:trustedadvisor::000000000000:recommendation-resource/5a694939-2e54-45a2-ae72-730598fa89d0/bb38affc0ce0681d9a6cd13f30238ba03a8f63dfe7a379dc403c619119d86af",
                "awsResourceId": "database-1-instance-1",
                "id": "bb38affc0ce0681d9a6cd13f302383ba03a8f63dfe7a379dc403c619119d86af",
                "lastUpdatedAt": "2023-11-01T15:09:51.891Z",
                "metadata": {
                    "0": "14",
                    "1": "208.79999999999998",
                    "2": "database-1-instance-1",
                    "3": "db.r5.large",
                    "4": "false",
                    "5": "us-west-2",
                    "6": "arn:aws:rds:us-west-2:000000000000:db:database-1-instance-1",
                    "7": "1"
                },
                "recommendationArn": "arn:aws:trustedadvisor:::organization-recommendation/5a694939-2e54-45a2-ae72-730598fa89d0",
                "regionCode": "us-west-2",
                "status": "warning"
            },
            {
                "arn": "arn:aws:trustedadvisor::000000000000:recommendation-resource/5a694939-2e54-45a2-ae72-730598fa89d0/51fded4d7a3278818df9cfe344ff5762cec46c095a6763d1ba1ba53bd0e1b0e6",
                "awsResourceId": "database-1",
                "id": "51fded4d7a3278818df9cfe344ff5762cec46c095a6763d1ba1ba53bd0e1b0e6",
                "lastUpdatedAt": "2023-11-01T15:09:51.891Z",
                "metadata": {
                    "0": "14",
                    "1": "31.679999999999996",
                    "2": "database-1",
                    "3": "db.t3.small",
                    "4": "false",
                    "5": "us-west-2",
                    "6": "arn:aws:rds:us-west-2:000000000000:db:database-1",
                    "7": "20"
                },
                "recommendationArn": "arn:aws:trustedadvisor:::organization-recommendation/5a694939-2e54-45a2-ae72-730598fa89d0",
                "regionCode": "us-west-2",
                "status": "warning"
            },
            {
                "arn": "arn:aws:trustedadvisor::000000000000:recommendation-resource/5a694939-2e54-45a2-ae72-730598fa89d0/f4d01bd20f4cd5372062aafc8786c489e48f0ead7cdab121463bf9f89e40a36b",
                "awsResourceId": "database-2-instance-1-us-west-2a",
                "id": "f4d01bd20f4cd5372062aafc8786c489e48f0ead7cdab121463bf9f89e40a36b",
                "lastUpdatedAt": "2023-11-01T15:09:51.891Z",
                "metadata": {
                    "0": "14",
                    "1": "187.20000000000002",
                    "2": "database-2-instance-1-us-west-2a",
                    "3": "db.r6g.large",
                    "4": "true",
                    "5": "us-west-2",
                    "6": "arn:aws:rds:us-west-2:000000000000:db:database-2-instance-1-us-west-2a",
                    "7": "1"
                },
                "recommendationArn": "arn:aws:trustedadvisor:::organization-recommendation/5a694939-2e54-45a2-ae72-730598fa89d0",
                "regionCode": "us-west-2",
                "status": "warning"
            },
        ],
        "nextToken": "REDACTED"
    }

For more information, see `Get started with the Trusted Advisor API <https://docs.aws.amazon.com/awssupport/latest/user/get-started-with-aws-trusted-advisor-api.html>`__ in the *AWS Trusted Advisor User Guide*.
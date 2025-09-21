**To list organization recommendation accounts**

The following ``list-organization-recommendation-accounts`` example lists all account recommendation summaries for an organization recommendation by its identifier. ::

    aws trustedadvisor list-organization-recommendation-accounts \
        --organization-recommendation-identifier arn:aws:trustedadvisor:::organization-recommendation/9534ec9b-bf3a-44e8-8213-2ed68b39d9d5

Output::

    {
        "accountRecommendationLifecycleSummaries": [{
            "accountId": "000000000000",
            "accountRecommendationArn": "arn:aws:trustedadvisor::000000000000:recommendation/9534ec9b-bf3a-44e8-8213-2ed68b39d9d5",
            "lifecycleStage": "resolved",
            "updateReason": "Resolved issue",
            "updateReasonCode": "valid_business_case",
            "lastUpdatedAt": "2023-01-17T18:25:44.552Z"
        }],
        "nextToken": "REDACTED"
    }

For more information, see `Get started with the Trusted Advisor API <https://docs.aws.amazon.com/awssupport/latest/user/get-started-with-aws-trusted-advisor-api.html>`__ in the *AWS Trusted Advisor User Guide*.
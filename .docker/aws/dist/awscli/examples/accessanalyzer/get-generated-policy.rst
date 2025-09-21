**To retrieve the policy that was generated using the `StartPolicyGeneration` API**

The following ``get-generated-policy`` example retrieves the policy that was generated using the `StartPolicyGeneration` API in your AWS account. ::

    aws accessanalyzer get-generated-policy \
        --job-id c557dc4a-0338-4489-95dd-739014860ff9

Output::

    {
        "generatedPolicyResult": {
            "generatedPolicies": [
                {
                    "policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"SupportedServiceSid0\",\"Effect\":\"Allow\",\"Action\":[\"access-analyzer:GetAnalyzer\",\"access-analyzer:ListAnalyzers\",\"access-analyzer:ListArchiveRules\",\"access-analyzer:ListFindings\",\"cloudtrail:DescribeTrails\",\"cloudtrail:GetEventDataStore\",\"cloudtrail:GetEventSelectors\",\"cloudtrail:GetInsightSelectors\",\"cloudtrail:GetTrailStatus\",\"cloudtrail:ListChannels\",\"cloudtrail:ListEventDataStores\",\"cloudtrail:ListQueries\",\"cloudtrail:ListTags\",\"cloudtrail:LookupEvents\",\"ec2:DescribeRegions\",\"iam:GetAccountSummary\",\"iam:GetOpenIDConnectProvider\",\"iam:GetRole\",\"iam:ListAccessKeys\",\"iam:ListAccountAliases\",\"iam:ListOpenIDConnectProviders\",\"iam:ListRoles\",\"iam:ListSAMLProviders\",\"kms:ListAliases\",\"s3:GetBucketLocation\",\"s3:ListAllMyBuckets\"],\"Resource\":\"*\"}]}"
                }
            ],
            "properties": {
                "cloudTrailProperties": {
                    "endTime": "2024-02-14T22:44:40+00:00",
                    "startTime": "2024-02-13T00:30:00+00:00",
                    "trailProperties": [
                        {
                            "allRegions": true,
                            "cloudTrailArn": "arn:aws:cloudtrail:us-west-2:111122223333:trail/my-trail",
                            "regions": []
                        }
                    ]
                },
                "isComplete": false,
                "principalArn": "arn:aws:iam::111122223333:role/Admin"
            }
        },
        "jobDetails": {
            "completedOn": "2024-02-14T22:47:01+00:00",
            "jobId": "c557dc4a-0338-4489-95dd-739014860ff9",
            "startedOn": "2024-02-14T22:44:41+00:00",
            "status": "SUCCEEDED"
        }
    }

For more information, see `IAM Access Analyzer policy generation <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html>`__ in the *AWS IAM User Guide*.
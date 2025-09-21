**To list all of the policy generations requested in the last seven days**

The following ``list-policy-generations`` example lists all of the policy generations requested in the last seven days in your AWS account. ::

    aws accessanalyzer list-policy-generations

Output::

    {
        "policyGenerations": [
            {
                "completedOn": "2024-02-14T23:43:38+00:00",
                "jobId": "923a56b0-ebb8-4e80-8a3c-a11ccfbcd6f2",
                "principalArn": "arn:aws:iam::111122223333:role/Admin",
                "startedOn": "2024-02-14T23:43:02+00:00",
                "status": "CANCELED"
            },
            {
                "completedOn": "2024-02-14T22:47:01+00:00",
                "jobId": "c557dc4a-0338-4489-95dd-739014860ff9",
                "principalArn": "arn:aws:iam::111122223333:role/Admin",
                "startedOn": "2024-02-14T22:44:41+00:00",
                "status": "SUCCEEDED"
            }
        ]
    }

For more information, see `IAM Access Analyzer policy generation <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html>`__ in the *AWS IAM User Guide*.
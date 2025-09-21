**To retrieve information about the specified finding**

The following ``get-finding`` example etrieves information about the specified finding in your AWS account. ::

    aws accessanalyzer get-finding \
        --analyzer-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-organization \
        --id 0910eedb-381e-4e95-adda-0d25c19e6e90

Output::

    {
        "finding": {
            "id": "0910eedb-381e-4e95-adda-0d25c19e6e90",
            "principal": {
                "Federated": "cognito-identity.amazonaws.com"
            },
            "action": [
                "sts:AssumeRoleWithWebIdentity"
            ],
            "resource": "arn:aws:iam::111122223333:role/Cognito_testpoolAuth_Role",
            "isPublic": false,
            "resourceType": "AWS::IAM::Role",
            "condition": {
                "cognito-identity.amazonaws.com:aud": "us-west-2:EXAMPLE0-0000-0000-0000-000000000000"
            },
            "createdAt": "2021-02-26T21:17:50.905000+00:00",
            "analyzedAt": "2024-02-16T18:17:47.888000+00:00",
            "updatedAt": "2021-02-26T21:17:50.905000+00:00",
            "status": "ACTIVE",
            "resourceOwnerAccount": "111122223333"
        }
    }

For more information, see `Reviewing findings <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-findings-view.html>`__ in the *AWS IAM User Guide*.
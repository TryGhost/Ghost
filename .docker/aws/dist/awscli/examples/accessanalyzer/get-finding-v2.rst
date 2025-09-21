**To retrieve information about the specified finding**

The following ``get-finding-v2`` example etrieves information about the specified finding in your AWS account. ::

    aws accessanalyzer get-finding-v2 \
        --analyzer-arn arn:aws:access-analyzer:us-west-2:111122223333:analyzer/ConsoleAnalyzer-organization \
        --id 0910eedb-381e-4e95-adda-0d25c19e6e90

Output::

    {
        "findingDetails": [
            {
                "externalAccessDetails": {
                    "action": [
                        "sts:AssumeRoleWithWebIdentity"
                    ],
                    "condition": {
                        "cognito-identity.amazonaws.com:aud": "us-west-2:EXAMPLE0-0000-0000-0000-000000000000"
                    },
                    "isPublic": false,
                    "principal": {
                        "Federated": "cognito-identity.amazonaws.com"
                    }
                }
            }
        ],
        "resource": "arn:aws:iam::111122223333:role/Cognito_testpoolAuth_Role",
        "status": "ACTIVE",
        "error": null,
        "createdAt": "2021-02-26T21:17:50.905000+00:00",
        "resourceType": "AWS::IAM::Role",
        "findingType": "ExternalAccess",
        "resourceOwnerAccount": "111122223333",
        "analyzedAt": "2024-02-16T18:17:47.888000+00:00",
        "id": "0910eedb-381e-4e95-adda-0d25c19e6e90",
        "updatedAt": "2021-02-26T21:17:50.905000+00:00"
    }

For more information, see `Reviewing findings <https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-findings-view.html>`__ in the *AWS IAM User Guide*.
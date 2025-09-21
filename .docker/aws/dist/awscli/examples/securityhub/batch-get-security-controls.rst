**To get security control details**

The following ``batch-get-security-controls`` example gets details for the security controls ACM.1 and IAM.1 in the current AWS account and AWS Region. ::

    aws securityhub batch-get-security-controls \
        --security-control-ids '["ACM.1", "IAM.1"]'

Output::

    {
        "SecurityControls": [
            {
                "SecurityControlId": "ACM.1",
                "SecurityControlArn": "arn:aws:securityhub:us-east-2:123456789012:security-control/ACM.1",
                "Title": "Imported and ACM-issued certificates should be renewed after a specified time period",
                "Description": "This control checks whether an AWS Certificate Manager (ACM) certificate is renewed within the specified time period. It checks both imported certificates and certificates provided by ACM. The control fails if the certificate isn't renewed within the specified time period. Unless you provide a custom parameter value for the renewal period, Security Hub uses a default value of 30 days.",
                "RemediationUrl": "https://docs.aws.amazon.com/console/securityhub/ACM.1/remediation",
                "SeverityRating": "MEDIUM",
                "SecurityControlStatus": "ENABLED"
                "UpdateStatus": "READY",
                "Parameters": {
                    "daysToExpiration": {
                        "ValueType": CUSTOM,
                        "Value": {
                            "Integer": 15
                        }
                    }
                },
                "LastUpdateReason": "Updated control parameter"
            },
            {
                "SecurityControlId": "IAM.1",
                "SecurityControlArn": "arn:aws:securityhub:us-east-2:123456789012:security-control/IAM.1",
                "Title": "IAM policies should not allow full \"*\" administrative privileges",
                "Description": "This AWS control checks whether the default version of AWS Identity and Access Management (IAM) policies (also known as customer managed policies) do not have administrator access with a statement that has \"Effect\": \"Allow\" with \"Action\": \"*\" over \"Resource\": \"*\". It only checks for the Customer Managed Policies that you created, but not inline and AWS Managed Policies.",
                "RemediationUrl": "https://docs.aws.amazon.com/console/securityhub/IAM.1/remediation",
                "SeverityRating": "HIGH",
                "SecurityControlStatus": "ENABLED"
                "UpdateStatus": "READY",
                "Parameters": {}
            }
        ]
    }

For more information, see `Viewing details for a control <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards-control-details.html>`__ in the *AWS Security Hub User Guide*.
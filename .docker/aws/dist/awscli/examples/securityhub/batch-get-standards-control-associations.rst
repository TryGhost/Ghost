**To get the enablement status of a control**

The following ``batch-get-standards-control-associations`` example identifies whether the specified controls are enabled in the specified standards. ::

    aws securityhub batch-get-standards-control-associations \
        --standards-control-association-ids '[{"SecurityControlId": "Config.1","StandardsArn": "arn:aws:securityhub:us-east-1:123456789012:ruleset/cis-aws-foundations-benchmark/v/1.2.0"}, {"SecurityControlId": "IAM.6","StandardsArn": "arn:aws:securityhub:us-east-1:123456789012:standards/aws-foundational-security-best-practices/v/1.0.0"}]'

Output::

    {
        "StandardsControlAssociationDetails": [
            {
                "StandardsArn": "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0",
                "SecurityControlId": "Config.1",
                "SecurityControlArn": "arn:aws:securityhub:us-east-1:068873283051:security-control/Config.1",
                "AssociationStatus": "ENABLED",
                "RelatedRequirements": [
                    "CIS AWS Foundations 2.5"
                ],
                "UpdatedAt": "2022-10-27T16:07:12.960000+00:00",
                "StandardsControlTitle": "Ensure AWS Config is enabled",
                "StandardsControlDescription": "AWS Config is a web service that performs configuration management of supported AWS resources within your account and delivers log files to you. The recorded information includes the configuration item (AWS resource), relationships between configuration items (AWS resources), and any configuration changes between resources. It is recommended to enable AWS Config in all regions.",
                "StandardsControlArns": [
                    "arn:aws:securityhub:us-east-1:068873283051:control/cis-aws-foundations-benchmark/v/1.2.0/2.5"
                ]
            },
            {
                "StandardsArn": "arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0",
                "SecurityControlId": "IAM.6",
                "SecurityControlArn": "arn:aws:securityhub:us-east-1:068873283051:security-control/IAM.6",
                "AssociationStatus": "DISABLED",
                "RelatedRequirements": [],
                "UpdatedAt": "2022-11-22T21:30:35.080000+00:00",
                "UpdatedReason": "test",
                "StandardsControlTitle": "Hardware MFA should be enabled for the root user",
                "StandardsControlDescription": "This AWS control checks whether your AWS account is enabled to use a hardware multi-factor authentication (MFA) device to sign in with root user credentials.",
                "StandardsControlArns": [
                    "arn:aws:securityhub:us-east-1:068873283051:control/aws-foundational-security-best-practices/v/1.0.0/IAM.6"
                ]
            }
        ]
    }

For more information, see `Enabling and disabling controls in specific standards <https://docs.aws.amazon.com/securityhub/latest/userguide/controls-configure.html>`__ in the *AWS Security Hub User Guide*.
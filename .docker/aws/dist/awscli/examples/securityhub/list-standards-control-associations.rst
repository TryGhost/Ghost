**To get the enablement status of a control in each enabled standard**

The following ``list-standards-control-associations`` example lists the enablement status of CloudTrail.1 in each enabled standard. ::

    aws securityhub list-standards-control-associations \
        --security-control-id CloudTrail.1

Output::

    {
        "StandardsControlAssociationSummaries": [
            {
                "StandardsArn": "arn:aws:securityhub:us-east-2::standards/nist-800-53/v/5.0.0",
                "SecurityControlId": "CloudTrail.1",
                "SecurityControlArn": "arn:aws:securityhub:us-east-2:123456789012:security-control/CloudTrail.1",
                "AssociationStatus": "ENABLED",
                "RelatedRequirements": [
                    "NIST.800-53.r5 AC-2(4)",
                    "NIST.800-53.r5 AC-4(26)",
                    "NIST.800-53.r5 AC-6(9)",
                    "NIST.800-53.r5 AU-10",
                    "NIST.800-53.r5 AU-12",
                    "NIST.800-53.r5 AU-2",
                    "NIST.800-53.r5 AU-3",
                    "NIST.800-53.r5 AU-6(3)",
                    "NIST.800-53.r5 AU-6(4)",
                    "NIST.800-53.r5 AU-14(1)",
                    "NIST.800-53.r5 CA-7",
                    "NIST.800-53.r5 SC-7(9)",
                    "NIST.800-53.r5 SI-3(8)",
                    "NIST.800-53.r5 SI-4(20)",
                    "NIST.800-53.r5 SI-7(8)",
                    "NIST.800-53.r5 SA-8(22)"
                ],
                "UpdatedAt": "2023-05-15T17:52:21.304000+00:00",
                "StandardsControlTitle": "CloudTrail should be enabled and configured with at least one multi-Region trail that includes read and write management events",
                "StandardsControlDescription": "This AWS control checks that there is at least one multi-region AWS CloudTrail trail includes read and write management events."
            },
            {
                "StandardsArn": "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0",
                "SecurityControlId": "CloudTrail.1",
                "SecurityControlArn": "arn:aws:securityhub:us-east-2:123456789012:security-control/CloudTrail.1",
                "AssociationStatus": "ENABLED",
                "RelatedRequirements": [
                    "CIS AWS Foundations 2.1"
                ],
                "UpdatedAt": "2020-02-10T21:22:53.998000+00:00",
                "StandardsControlTitle": "Ensure CloudTrail is enabled in all regions",
                "StandardsControlDescription": "AWS CloudTrail is a web service that records AWS API calls for your account and delivers log files to you. The recorded information includes the identity of the API caller, the time of the API call, the source IP address of the API caller, the request parameters, and the response elements returned by the AWS service."
            },
            {
                "StandardsArn": "arn:aws:securityhub:us-east-2::standards/aws-foundational-security-best-practices/v/1.0.0",
                "SecurityControlId": "CloudTrail.1",
                "SecurityControlArn": "arn:aws:securityhub:us-east-2:123456789012:security-control/CloudTrail.1",
                "AssociationStatus": "DISABLED",
                "RelatedRequirements": [],
                "UpdatedAt": "2023-05-15T19:31:52.671000+00:00",
                "UpdatedReason": "Alternative compensating controls are in place",
                "StandardsControlTitle": "CloudTrail should be enabled and configured with at least one multi-Region trail that includes read and write management events",
                "StandardsControlDescription": "This AWS control checks that there is at least one multi-region AWS CloudTrail trail includes read and write management events."
            },
            {
                "StandardsArn": "arn:aws:securityhub:us-east-2::standards/cis-aws-foundations-benchmark/v/1.4.0",
                "SecurityControlId": "CloudTrail.1",
                "SecurityControlArn": "arn:aws:securityhub:us-east-2:123456789012:security-control/CloudTrail.1",
                "AssociationStatus": "ENABLED",
                "RelatedRequirements": [
                    "CIS AWS Foundations Benchmark v1.4.0/3.1"
                ],
                "UpdatedAt": "2022-11-10T15:40:36.021000+00:00",
                "StandardsControlTitle": "Ensure CloudTrail is enabled in all regions",
                "StandardsControlDescription": "AWS CloudTrail is a web service that records AWS API calls for your account and delivers log files to you. The recorded information includes the identity of the API caller, the time of the API call, the source IP address of the API caller, the request parameters, and the response elements returned by the AWS service. CloudTrail provides a history of AWS API calls for an account, including API calls made via the Management Console, SDKs, command line tools, and higher-level AWS services (such as CloudFormation)."
            }
        ]
    }

For more information, see `Enabling and disabling controls in specific standards <https://docs.aws.amazon.com/securityhub/latest/userguide/controls-configure.html>`__ in the *AWS Security Hub User Guide*.
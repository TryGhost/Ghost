**Example 1: To return findings generated for a specific standard**

The following ``get-findings`` example returns findings for the PCI DSS standard. ::

    aws securityhub get-findings \
        --filters '{"GeneratorId":[{"Value": "pci-dss","Comparison":"PREFIX"}]}' \
        --max-items 1

Output::

    {
        "Findings": [
            {
                "SchemaVersion": "2018-10-08",
                "Id": "arn:aws:securityhub:eu-central-1:123456789012:subscription/pci-dss/v/3.2.1/PCI.Lambda.2/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "ProductArn": "arn:aws:securityhub:us-west-1::product/aws/securityhub",
                "GeneratorId": "pci-dss/v/3.2.1/PCI.Lambda.2",
                "AwsAccountId": "123456789012",
                "Types": [
                    "Software and Configuration Checks/Industry and Regulatory Standards/PCI-DSS"
                ],
                "FindingProviderFields": {
                    "Severity": {
                        "Original": 0,
                        "Label": "INFORMATIONAL"
                    },
                    "Types": [
                        "Software and Configuration Checks/Industry and Regulatory Standards/PCI-DSS"
                    ]
                },
                "FirstObservedAt": "2020-06-02T14:02:49.159Z",
                "LastObservedAt": "2020-06-02T14:02:52.397Z",
                "CreatedAt": "2020-06-02T14:02:49.159Z",
                "UpdatedAt": "2020-06-02T14:02:52.397Z",
                "Severity": {
                    "Original": 0,
                    "Label": "INFORMATIONAL",
                    "Normalized": 0
                },
                "Title": "PCI.Lambda.2 Lambda functions should be in a VPC",
                "Description": "This AWS control checks whether a Lambda function is in a VPC.",
                "Remediation": {
                    "Recommendation": {
                        "Text": "For directions on how to fix this issue, please consult the AWS Security Hub PCI DSS documentation.",
                        "Url": "https://docs.aws.amazon.com/console/securityhub/PCI.Lambda.2/remediation"
                    }
                },
                "ProductFields": {
                    "StandardsArn": "arn:aws:securityhub:::standards/pci-dss/v/3.2.1",
                    "StandardsSubscriptionArn": "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1",
                    "ControlId": "PCI.Lambda.2",
                    "RecommendationUrl": "https://docs.aws.amazon.com/console/securityhub/PCI.Lambda.2/remediation",
                    "RelatedAWSResources:0/name": "securityhub-lambda-inside-vpc-0e904a3b",
                    "RelatedAWSResources:0/type": "AWS::Config::ConfigRule",
                    "StandardsControlArn": "arn:aws:securityhub:us-west-1:123456789012:control/pci-dss/v/3.2.1/PCI.Lambda.2",
                    "aws/securityhub/SeverityLabel": "INFORMATIONAL",
                    "aws/securityhub/ProductName": "Security Hub",
                    "aws/securityhub/CompanyName": "AWS",
                    "aws/securityhub/FindingId": "arn:aws:securityhub:eu-central-1::product/aws/securityhub/arn:aws:securityhub:eu-central-1:123456789012:subscription/pci-dss/v/3.2.1/PCI.Lambda.2/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
            },
                "Resources": [
                    {
                        "Type": "AwsAccount",
                        "Id": "AWS::::Account:123456789012",
                        "Partition": "aws",
                        "Region": "us-west-1"
                    }
                ],
                "Compliance": {
                    "Status": "PASSED",
                    "RelatedRequirements": [
                        "PCI DSS 1.2.1",
                        "PCI DSS 1.3.1",
                        "PCI DSS 1.3.2",
                        "PCI DSS 1.3.4"
                    ]
                },
                "WorkflowState": "NEW",
                "Workflow": {
                    "Status": "NEW"
                },
                "RecordState": "ARCHIVED"
            }
        ],
        "NextToken": "eyJOZXh0VG9rZW4iOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAxfQ=="
    }

**Example 2: To return critical-severity findings that have a workflow status of NOTIFIED**

The following ``get-findings`` example returns findings that have a severity label value of CRITICAL and a workflow status of NOTIFIED. The results are sorted in descending order by the value of Confidence. ::

    aws securityhub get-findings \
        --filters '{"SeverityLabel":[{"Value": "CRITICAL","Comparison":"EQUALS"}],"WorkflowStatus": [{"Value":"NOTIFIED","Comparison":"EQUALS"}]}' \
        --sort-criteria '{ "Field": "Confidence", "SortOrder": "desc"}' \
        --max-items 1

Output::

    {
        "Findings": [
            {
                "SchemaVersion": "2018-10-08",
                "Id": "arn:aws:securityhub:us-west-1: 123456789012:subscription/cis-aws-foundations-benchmark/v/1.2.0/1.13/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "ProductArn": "arn:aws:securityhub:us-west-2::product/aws/securityhub",
                "GeneratorId": "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0/rule/1.13",
                "AwsAccountId": "123456789012",
                "Types": [
                    "Software and Configuration Checks/Industry and Regulatory Standards/CIS AWS Foundations Benchmark"
                ],
                "FindingProviderFields" {
                    "Severity": {
                        "Original": 90,
                        "Label": "CRITICAL"
                    },
                    "Types": [
                        "Software and Configuration Checks/Industry and Regulatory Standards/CIS AWS Foundations Benchmark"
                    ]
                },
                "FirstObservedAt": "2020-05-21T20:16:34.752Z",
                "LastObservedAt": "2020-06-09T08:16:37.171Z",
                "CreatedAt": "2020-05-21T20:16:34.752Z",
                "UpdatedAt": "2020-06-09T08:16:36.430Z",
                "Severity": {
                    "Original": 90,
                    "Label": "CRITICAL",
                    "Normalized": 90
                },
                "Title": "1.13 Ensure MFA is enabled for the \"root\" account",
                "Description": "The root account is the most privileged user in an AWS account. MFA adds an extra layer of protection on top of a user name and password. With MFA enabled, when a user signs in to an AWS website, they will be prompted for their user name and password as well as for an authentication code from their AWS MFA device.",
                "Remediation": {
                    "Recommendation": {
                        "Text": "For directions on how to fix this issue, please consult the AWS Security Hub CIS documentation.",
                        "Url": "https://docs.aws.amazon.com/console/securityhub/standards-cis-1.13/remediation"
                    }
                },
                "ProductFields": {
                    "StandardsGuideArn": "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0",
                    "StandardsGuideSubscriptionArn": "arn:aws:securityhub:us-west-1:123456789012:subscription/cis-aws-foundations-benchmark/v/1.2.0",
                    "RuleId": "1.13",
                    "RecommendationUrl": "https://docs.aws.amazon.com/console/securityhub/standards-cis-1.13/remediation",
                    "RelatedAWSResources:0/name": "securityhub-root-account-mfa-enabled-5pftha",
                    "RelatedAWSResources:0/type": "AWS::Config::ConfigRule",
                    "StandardsControlArn": "arn:aws:securityhub:us-west-1:123456789012:control/cis-aws-foundations-benchmark/v/1.2.0/1.13",
                    "aws/securityhub/SeverityLabel": "CRITICAL",
                    "aws/securityhub/ProductName": "Security Hub",
                    "aws/securityhub/CompanyName": "AWS",
                    "aws/securityhub/FindingId": "arn:aws:securityhub:us-west-1::product/aws/securityhub/arn:aws:securityhub:us-west-1:123456789012:subscription/cis-aws-foundations-benchmark/v/1.2.0/1.13/finding/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
                },
                "Resources": [
                    {
                        "Type": "AwsAccount",
                        "Id": "AWS::::Account:123456789012",
                        "Partition": "aws",
                        "Region": "us-west-1"
                    }
                ],
                "Compliance": {
                    "Status": "FAILED"
                },
                "WorkflowState": "NEW",
                "Workflow": {
                    "Status": "NOTIFIED"
                },
                "RecordState": "ACTIVE"
            }
        ]
    }

For more information, see `Filtering and grouping findings <https://docs.aws.amazon.com/securityhub/latest/userguide/findings-filtering-grouping.html>`__ in the *AWS Security Hub User Guide*.

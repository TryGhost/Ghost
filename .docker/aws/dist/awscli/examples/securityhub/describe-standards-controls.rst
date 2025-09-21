**To request the list of controls in an enabled standard**

The following ``describe-standards-controls`` example requests the list of controls in the requestor account's subscription to the PCI DSS standard. The request returns two controls at a time. ::

    aws securityhub describe-standards-controls \
        --standards-subscription-arn "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1" \
        --max-results 2

Output::

    {
        "Controls": [
            {
                "StandardsControlArn": "arn:aws:securityhub:us-west-1:123456789012:control/pci-dss/v/3.2.1/PCI.AutoScaling.1",
                "ControlStatus": "ENABLED",
                "ControlStatusUpdatedAt": "2020-05-15T18:49:04.473000+00:00",
                "ControlId": "PCI.AutoScaling.1",
                "Title": "Auto scaling groups associated with a load balancer should use health checks",
                "Description": "This AWS control checks whether your Auto Scaling groups that are associated with a load balancer are using Elastic Load Balancing health checks.",
                "RemediationUrl": "https://docs.aws.amazon.com/console/securityhub/PCI.AutoScaling.1/remediation",
                "SeverityRating": "LOW",
                "RelatedRequirements": [
                    "PCI DSS 2.2"
                ]
            },
            {
                "StandardsControlArn": "arn:aws:securityhub:us-west-1:123456789012:control/pci-dss/v/3.2.1/PCI.CW.1",
                "ControlStatus": "ENABLED",
                "ControlStatusUpdatedAt": "2020-05-15T18:49:04.498000+00:00",
                "ControlId": "PCI.CW.1",
                "Title": "A log metric filter and alarm should exist for usage of the \"root\" user",
                "Description": "This control checks for the CloudWatch metric filters using the following pattern { $.userIdentity.type = \"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != \"AwsServiceEvent\" } It checks that the log group name is configured for use with active multi-region CloudTrail, that there is at least one Event Selector for a Trail with IncludeManagementEvents set to true and ReadWriteType set to All, and that there is at least one active subscriber to an SNS topic associated with the alarm.",
                "RemediationUrl": "https://docs.aws.amazon.com/console/securityhub/PCI.CW.1/remediation",
                "SeverityRating": "MEDIUM",
                "RelatedRequirements": [
                    "PCI DSS 7.2.1"
                ]
            }
        ],
        "NextToken": "U2FsdGVkX1+eNkPoZHVl11ip5HUYQPWSWZGmftcmJiHL8JoKEsCDuaKayiPDyLK+LiTkShveoOdvfxXCkOBaGhohIXhsIedN+LSjQV/l7kfCfJcq4PziNC1N9xe9aq2pjlLVZnznTfSImrodT5bRNHe4fELCQq/z+5ka+5Lzmc11axcwTd5lKgQyQqmUVoeriHZhyIiBgWKf7oNYdBVG8OEortVWvSkoUTt+B2ThcnC7l43kI0UNxlkZ6sc64AsW"
    }

For more information, see `Viewing details for controls <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards-view-controls.html>`__ in the *AWS Security Hub User Guide*.

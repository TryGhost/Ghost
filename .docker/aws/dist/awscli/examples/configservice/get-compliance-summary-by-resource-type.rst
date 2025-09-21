**To get the compliance summary for all resource types**

The following command returns the number of AWS resources that are noncompliant and the number that are compliant::

    aws configservice get-compliance-summary-by-resource-type

In the output, the value for each ``CappedCount`` attribute indicates how many resources are compliant or noncompliant.

Output::

    {
        "ComplianceSummariesByResourceType": [
            {
                "ComplianceSummary": {
                    "NonCompliantResourceCount": {
                        "CappedCount": 16,
                        "CapExceeded": false
                    },
                    "ComplianceSummaryTimestamp": 1453237464.543,
                    "CompliantResourceCount": {
                        "CappedCount": 10,
                        "CapExceeded": false
                    }
                }
            }
        ]
    }

**To get the compliance summary for a specific resource type**

The following command returns the number of EC2 instances that are noncompliant and the number that are compliant::

    aws configservice get-compliance-summary-by-resource-type --resource-types AWS::EC2::Instance

In the output, the value for each ``CappedCount`` attribute indicates how many resources are compliant or noncompliant.

Output::

    {
        "ComplianceSummariesByResourceType": [
            {
                "ResourceType": "AWS::EC2::Instance",
                "ComplianceSummary": {
                    "NonCompliantResourceCount": {
                        "CappedCount": 3,
                        "CapExceeded": false
                    },
                    "ComplianceSummaryTimestamp": 1452204923.518,
                    "CompliantResourceCount": {
                        "CappedCount": 7,
                        "CapExceeded": false
                    }
                }
            }
        ]
    }
**To get compliance information for your AWS resources**

The following command returns compliance information for each EC2 instance that is recorded by AWS Config and that violates one or more rules::

    aws configservice describe-compliance-by-resource --resource-type AWS::EC2::Instance --compliance-types NON_COMPLIANT

In the output, the value for each ``CappedCount`` attribute indicates how many rules the resource violates. For example, the following output indicates that instance ``i-1a2b3c4d`` violates 2 rules.

Output::

    {
        "ComplianceByResources": [
            {
                "ResourceType": "AWS::EC2::Instance",
                "ResourceId": "i-1a2b3c4d",
                "Compliance": {
                    "ComplianceContributorCount": {
                        "CappedCount": 2,
                        "CapExceeded": false
                    },
                    "ComplianceType": "NON_COMPLIANT"
                }
            },
            {
                "ResourceType": "AWS::EC2::Instance",
                "ResourceId": "i-2a2b3c4d ",
                "Compliance": {
                    "ComplianceContributorCount": {
                        "CappedCount": 3,
                        "CapExceeded": false
                    },
                    "ComplianceType": "NON_COMPLIANT"
                }
            }
        ]
    }
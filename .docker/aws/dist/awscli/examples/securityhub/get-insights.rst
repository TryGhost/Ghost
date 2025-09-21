**To retrieve details about an insight**

The following ``get-insights`` example retrieves the configuration details for the insight with the specified ARN. ::

    aws securityhub get-insights \
        --insight-arns "arn:aws:securityhub:us-west-1:123456789012:insight/123456789012/custom/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"

Output::

    {
        "Insights": [ 
            { 
                "Filters": { 
                   "ResourceType": [ 
                        { 
                            "Comparison": "EQUALS",
                            "Value": "AwsIamRole"
                        }
                    ],
                    "SeverityLabel": [ 
                        { 
                            "Comparison": "EQUALS",
                            "Value": "CRITICAL"
                        }
                    ],
                },
                "GroupByAttribute": "ResourceId",
                "InsightArn": "arn:aws:securityhub:us-west-1:123456789012:insight/123456789012/custom/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "Name": "Critical role findings"
            }
        ]
    }

For more information, see `Insights in AWS Security Hub <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-insights.html>`__ in the *AWS Security Hub User Guide*.

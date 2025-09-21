**Example 1: To change the filter for a custom insight**

The following ``update-insight`` example changes the filters for a custom insight. The updated insight looks for findings with a high severity that are related to AWS roles. ::

    aws securityhub update-insight \
        --insight-arn "arn:aws:securityhub:us-west-1:123456789012:insight/123456789012/custom/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111" \
        --filters '{"ResourceType": [{ "Comparison": "EQUALS", "Value": "AwsIamRole"}], "SeverityLabel": [{"Comparison": "EQUALS", "Value": "HIGH"}]}' \
        --name "High severity role findings"

**Example 2: To change the grouping attribute for a custom insight**

The following ``update-insight`` example changes the grouping attribute for the custom insight with the specified ARN. The new grouping attribute is the resource ID. ::

    aws securityhub update-insight \
        --insight-arn "arn:aws:securityhub:us-west-1:123456789012:insight/123456789012/custom/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111" \
        --group-by-attribute "ResourceId" \
        --name "Critical role findings"

Output::

    {
        "Insights": [
            {
                "InsightArn": "arn:aws:securityhub:us-west-1:123456789012:insight/123456789012/custom/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "Name": "Critical role findings",
                "Filters": {
                    "SeverityLabel": [
                        {
                            "Value": "CRITICAL",
                            "Comparison": "EQUALS"
                        }
                    ],
                    "ResourceType": [
                        {
                            "Value": "AwsIamRole",
                            "Comparison": "EQUALS"
                        }
                    ]
                },
                "GroupByAttribute": "ResourceId"
            }
        ]
    }

For more information, see `Managing custom insights <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-custom-insights.html>`__ in the *AWS Security Hub User Guide*.

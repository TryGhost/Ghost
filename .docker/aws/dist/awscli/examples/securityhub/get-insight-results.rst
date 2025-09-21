**To retrieve the results for an insight**

The following ``get-insight-results`` example returns the list of insight results for the insight with the specified ARN. ::

    aws securityhub get-insight-results \
        --insight-arn "arn:aws:securityhub:us-west-1:123456789012:insight/123456789012/custom/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"

Output::

    {
        "InsightResults": { 
            "GroupByAttribute": "ResourceId",
            "InsightArn": "arn:aws:securityhub:us-west-1:123456789012:insight/123456789012/custom/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "ResultValues": [ 
                { 
                    "Count": 10,
                    "GroupByAttributeValue": "AWS::::Account:123456789111"
                },
                { 
                    "Count": 3,
                    "GroupByAttributeValue": "AWS::::Account:123456789222"
                }
            ]
        }
    }

For more information, see `Viewing and taking action on insight results and findings <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-insights-view-take-action.html>`__ in the *AWS Security Hub User Guide*.

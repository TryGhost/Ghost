**To create a custom insight**

The following ``create-insight`` example creates a custom insight named Critical role findings that returns critical findings that are related to AWS roles. ::

    aws securityhub create-insight \
        --filters '{"ResourceType": [{ "Comparison": "EQUALS", "Value": "AwsIamRole"}], "SeverityLabel": [{"Comparison": "EQUALS", "Value": "CRITICAL"}]}' \
        --group-by-attribute "ResourceId" \
        --name "Critical role findings"

Output::

    {
        "InsightArn": "arn:aws:securityhub:us-west-1:123456789012:insight/123456789012/custom/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }


For more information, see `Managing custom insights <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-custom-insights.html>`__ in the *AWS Security Hub User Guide*.

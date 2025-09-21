**To delete a custom insight**

The following ``delete-insight`` example deletes the custom insight with the specified ARN. ::

    aws securityhub delete-insight \
        --insight-arn "arn:aws:securityhub:us-west-1:123456789012:insight/123456789012/custom/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"

Output::

    {
       "InsightArn": "arn:aws:securityhub:eu-central-1:123456789012:insight/123456789012/custom/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Managing custom insights <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-custom-insights.html>`__ in the *AWS Security Hub User Guide*.

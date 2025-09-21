**To start receiving findings from a product integration**

The following ``enable-import-findings-for-product`` example enables the flow of findings from the specified product integration. ::

    aws securityhub enable-import-findings-for-product \
        --product-arn "arn:aws:securityhub:us-east-1:123456789333:product/crowdstrike/crowdstrike-falcon"

Output::

    {
        "ProductSubscriptionArn": "arn:aws:securityhub:us-east-1:123456789012:product-subscription/crowdstrike/crowdstrike-falcon"
    }

For more information, see `Managing product integrations <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-integrations-managing.html>`__ in the *AWS Security Hub User Guide*.

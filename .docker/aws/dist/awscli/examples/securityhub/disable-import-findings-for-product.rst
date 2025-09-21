**To stop receiving findings from a product integration**

The following ``disable-import-findings-for-product`` example disables the flow of findings for the specified subscription to a product integration. ::

    aws securityhub disable-import-findings-for-product \
        --product-subscription-arn "arn:aws:securityhub:us-west-1:123456789012:product-subscription/crowdstrike/crowdstrike-falcon"

This command produces no output.

For more information, see `Managing product integrations <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-integrations-managing.html>`__ in the *AWS Security Hub User Guide*.

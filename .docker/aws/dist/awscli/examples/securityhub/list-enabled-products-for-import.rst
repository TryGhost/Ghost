**To return the list of enabled product integrations**

The following ``list-enabled-products-for-import`` example returns the list of subscription ARNS for the currently enabled product integrations. ::

    aws securityhub list-enabled-products-for-import

Output::

    {
        "ProductSubscriptions": [ "arn:aws:securityhub:us-west-1:123456789012:product-subscription/crowdstrike/crowdstrike-falcon", "arn:aws:securityhub:us-west-1:123456789012:product-subscription/aws/securityhub" ]
    }

For more information, see `Managing product integrations <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-integrations-managing.html>`__ in the *AWS Security Hub User Guide*.

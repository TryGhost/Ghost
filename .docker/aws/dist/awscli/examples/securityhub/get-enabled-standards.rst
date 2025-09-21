**To retrieve information about an enabled standard**

The following ``get-enabled-standards`` example retrieves information about the PCI DSS standard. ::

    aws securityhub get-enabled-standards \
        --standards-subscription-arn "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1"

Output::

    {
        "StandardsSubscriptions": [ 
            { 
                "StandardsArn": "arn:aws:securityhub:us-west-1::standards/pci-dss/v/3.2.1",
                "StandardsInput": { },
                "StandardsStatus": "READY",
                "StandardsSubscriptionArn": "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1"
            }
        ]
    }

For more information, see `Security standards in AWS Security Hub <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards.html>`__ in the *AWS Security Hub User Guide*.

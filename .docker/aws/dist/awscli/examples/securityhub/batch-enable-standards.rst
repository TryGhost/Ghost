**To enable a standard**

The following ``batch-enable-standards`` example enables the PCI DSS standard for the requesting account. ::

    aws securityhub batch-enable-standards \
        --standards-subscription-requests '{"StandardsArn":"arn:aws:securityhub:us-west-1::standards/pci-dss/v/3.2.1"}'

Output::

    {
        "StandardsSubscriptions": [ 
            { 
                "StandardsArn": "arn:aws:securityhub:us-west-1::standards/pci-dss/v/3.2.1",
                "StandardsInput": { },
                "StandardsStatus": "PENDING",
                "StandardsSubscriptionArn": "arn:aws:securityhub:us-west-1:123456789012:subscription/pci-dss/v/3.2.1"
            }
        ]
    }

For more information, see `Disabling or enabling a security standard <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards-enable-disable.html>`__ in the *AWS Security Hub User Guide*.

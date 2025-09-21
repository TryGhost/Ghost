**To accept reserved node exchange**

The following ``accept-reserved-node-exchange`` example accepts exchange of a DC1 reserved node for a DC2 reserved node. ::

    aws redshift accept-reserved-node-exchange /
        --reserved-node-id 12345678-12ab-12a1-1a2a-12ab-12a12EXAMPLE /
        --target-reserved-node-offering-id 12345678-12ab-12a1-1a2a-12ab-12a12EXAMPLE

Output::

    {
        "ExchangedReservedNode": {
            "ReservedNodeId": "12345678-12ab-12a1-1a2a-12ab-12a12EXAMPLE",
            "ReservedNodeOfferingId": "12345678-12ab-12a1-1a2a-12ab-12a12EXAMPLE",
            "NodeType": "dc2.large",
            "StartTime": "2019-12-06T21:17:26Z",
            "Duration": 31536000,
            "FixedPrice": 0.0,
            "UsagePrice": 0.0,
            "CurrencyCode": "USD",
            "NodeCount": 1,
            "State": "exchanging",
            "OfferingType": "All Upfront",
            "RecurringCharges": [
                {
                    "RecurringChargeAmount": 0.0,
                    "RecurringChargeFrequency": "Hourly"
                }
            ],
            "ReservedNodeOfferingType": "Regular"
        }
    }

For more information, see `Upgrading Reserved Nodes With the AWS CLI <https://docs.aws.amazon.com/redshift/latest/mgmt/purchase-reserved-node-offering-console.html>`__ in the *Amazon Redshift Cluster Management Guide*.

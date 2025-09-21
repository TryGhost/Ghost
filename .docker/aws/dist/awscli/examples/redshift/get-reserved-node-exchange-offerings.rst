**To get reserved node exchange offerings**

The following ``get-reserved-node-exchange-offerings`` example retrieves an array of ``DC2`` ``ReservedNodeOfferings`` that match the specified ``DC1`` reserved node. ::

    aws redshift get-reserved-node-exchange-offerings \
        --reserved-node-id 12345678-12ab-12a1-1a2a-12ab-12a12EXAMPLE

Output::

    {
        "ReservedNodeOfferings": [
            {
                "ReservedNodeOfferingId": "12345678-12ab-12a1-1a2a-12ab-12a12EXAMPLE",
                "NodeType": "dc2.large",
                "Duration": 31536000,
                "FixedPrice": 0.0,
                "UsagePrice": 0.0,
                "CurrencyCode": "USD",
                "OfferingType": "All Upfront",
                "RecurringCharges": [
                    {
                        "RecurringChargeAmount": 0.0,
                        "RecurringChargeFrequency": "Hourly"
                    }
                ],
                "ReservedNodeOfferingType": "Regular"
            }
        ]
    }

For more information, see `Upgrading Reserved Nodes With the AWS CLI <https://docs.aws.amazon.com/redshift/latest/mgmt/purchase-reserved-node-offering-console.html>`__ in the *Amazon Redshift Cluster Management Guide*.

**To describe reserved DB instance offerings**

The following ``describe-reserved-db-instances-offerings`` example retrieves details about reserved DB instance options for ``oracle``. ::

    aws rds describe-reserved-db-instances-offerings \
        --product-description oracle

Output::

    {
        "ReservedDBInstancesOfferings": [
            {
                "CurrencyCode": "USD",
                "UsagePrice": 0.0,
                "ProductDescription": "oracle-se2(li)",
                "ReservedDBInstancesOfferingId": "005bdee3-9ef4-4182-aa0c-58ef7cb6c2f8",
                "MultiAZ": true,
                "DBInstanceClass": "db.m4.xlarge",
                "OfferingType": "Partial Upfront",
                "RecurringCharges": [
                    {
                        "RecurringChargeAmount": 0.594,
                        "RecurringChargeFrequency": "Hourly"
                    }
                ],
                "FixedPrice": 4089.0,
                "Duration": 31536000
            },
        ...some output truncated...
    }
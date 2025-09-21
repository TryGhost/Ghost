**Example 1: To find a reserved DB instance to purchase**

The following ``describe-reserved-db-instances-offerings`` example lists the available reserved MySQL DB instances with the db.t2.micro instance class and a duration of one year. The offering ID is required for purchasing a reserved DB instance. ::

    aws rds describe-reserved-db-instances-offerings \
        --product-description mysql \
        --db-instance-class db.t2.micro \
        --duration 1

Output::

    {
        "ReservedDBInstancesOfferings": [
            {
                "ReservedDBInstancesOfferingId": "8ba30be1-b9ec-447f-8f23-6114e3f4c7b4",
                "DBInstanceClass": "db.t2.micro",
                "Duration": 31536000,
                "FixedPrice": 51.0,
                "UsagePrice": 0.0,
                "CurrencyCode": "USD",
                "ProductDescription": "mysql",
                "OfferingType": "Partial Upfront",
                "MultiAZ": false,
                "RecurringCharges": [
                    {
                        "RecurringChargeAmount": 0.006,
                        "RecurringChargeFrequency": "Hourly"
                    }
                ]
            },
        ... some output truncated ...
        ]
    }

For more information, see `Reserved DB Instances for Amazon RDS <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html>`__ in the *Amazon RDS User Guide*.

**Example 2: To purchase a reserved DB instance**

The following ``purchase-reserved-db-instances-offering`` example shows how to buy the reserved DB instance offering from the previous example.

    aws rds purchase-reserved-db-instances-offering \
        --reserved-db-instances-offering-id 8ba30be1-b9ec-447f-8f23-6114e3f4c7b4

Output::

    {
        "ReservedDBInstance": {
            "ReservedDBInstanceId": "ri-2020-06-29-16-54-57-670",
            "ReservedDBInstancesOfferingId": "8ba30be1-b9ec-447f-8f23-6114e3f4c7b4",
            "DBInstanceClass": "db.t2.micro",
            "StartTime": "2020-06-29T16:54:57.670Z",
            "Duration": 31536000,
            "FixedPrice": 51.0,
            "UsagePrice": 0.0,
            "CurrencyCode": "USD",
            "DBInstanceCount": 1,
            "ProductDescription": "mysql",
            "OfferingType": "Partial Upfront",
            "MultiAZ": false,
            "State": "payment-pending",
            "RecurringCharges": [
                {
                    "RecurringChargeAmount": 0.006,
                    "RecurringChargeFrequency": "Hourly"
                }
            ],
            "ReservedDBInstanceArn": "arn:aws:rds:us-west-2:123456789012:ri:ri-2020-06-29-16-54-57-670"
        }
    }

For more information, see `Reserved DB Instances for Amazon RDS <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html>`__ in the *Amazon RDS User Guide*.
**To describe reserved DB instances**

The following ``describe-reserved-db-instances`` example retrieves details about any reserved DB instances in the current AWS account. ::

    aws rds describe-reserved-db-instances

Output::

    {
        "ReservedDBInstances": [
            {
                "ReservedDBInstanceId": "myreservedinstance",
                "ReservedDBInstancesOfferingId": "12ab34cd-59af-4b2c-a660-1abcdef23456",
                "DBInstanceClass": "db.t3.micro",
                "StartTime": "2020-06-01T13:44:21.436Z",
                "Duration": 31536000,
                "FixedPrice": 0.0,
                "UsagePrice": 0.0,
                "CurrencyCode": "USD",
                "DBInstanceCount": 1,
                "ProductDescription": "sqlserver-ex(li)",
                "OfferingType": "No Upfront",
                "MultiAZ": false,
                "State": "payment-pending",
                "RecurringCharges": [
                    {
                        "RecurringChargeAmount": 0.014,
                        "RecurringChargeFrequency": "Hourly"
                    }
                ],
                "ReservedDBInstanceArn": "arn:aws:rds:us-west-2:123456789012:ri:myreservedinstance",
                "LeaseId": "a1b2c3d4-6b69-4a59-be89-5e11aa446666"
            }
        ]
    }

For more information, see `Reserved DB Instances for Amazon RDS <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html>`__ in the *Amazon RDS User Guide*.

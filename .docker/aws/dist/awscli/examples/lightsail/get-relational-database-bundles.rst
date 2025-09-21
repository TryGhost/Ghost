**To get the bundles for new relational databases**

The following ``get-relational-database-bundles`` example displays details about all of the available relational database bundles that can be used to create new relational databases in Amazon Lightsail. Note that the response does not include inactive bundles because the ``--include-inactive`` flag is not specified in the command. You cannot use inactive bundles to create new relational databases. ::

    aws lightsail get-relational-database-bundles

Output::

    {
        "bundles": [
            {
                "bundleId": "micro_2_0",
                "name": "Micro",
                "price": 15.0,
                "ramSizeInGb": 1.0,
                "diskSizeInGb": 40,
                "transferPerMonthInGb": 100,
                "cpuCount": 2,
                "isEncrypted": true,
                "isActive": true
            },
            {
                "bundleId": "micro_ha_2_0",
                "name": "Micro with High Availability",
                "price": 30.0,
                "ramSizeInGb": 1.0,
                "diskSizeInGb": 40,
                "transferPerMonthInGb": 100,
                "cpuCount": 2,
                "isEncrypted": true,
                "isActive": true
            },
            {
                "bundleId": "small_2_0",
                "name": "Small",
                "price": 30.0,
                "ramSizeInGb": 2.0,
                "diskSizeInGb": 80,
                "transferPerMonthInGb": 100,
                "cpuCount": 2,
                "isEncrypted": true,
                "isActive": true
            },
            {
                "bundleId": "small_ha_2_0",
                "name": "Small with High Availability",
                "price": 60.0,
                "ramSizeInGb": 2.0,
                "diskSizeInGb": 80,
                "transferPerMonthInGb": 100,
                "cpuCount": 2,
                "isEncrypted": true,
                "isActive": true
            },
            {
                "bundleId": "medium_2_0",
                "name": "Medium",
                "price": 60.0,
                "ramSizeInGb": 4.0,
                "diskSizeInGb": 120,
                "transferPerMonthInGb": 100,
                "cpuCount": 2,
                "isEncrypted": true,
                "isActive": true
            },
            {
                "bundleId": "medium_ha_2_0",
                "name": "Medium with High Availability",
                "price": 120.0,
                "ramSizeInGb": 4.0,
                "diskSizeInGb": 120,
                "transferPerMonthInGb": 100,
                "cpuCount": 2,
                "isEncrypted": true,
                "isActive": true
            },
            {
                "bundleId": "large_2_0",
                "name": "Large",
                "price": 115.0,
                "ramSizeInGb": 8.0,
                "diskSizeInGb": 240,
                "transferPerMonthInGb": 200,
                "cpuCount": 2,
                "isEncrypted": true,
                "isActive": true
            },
            {
                "bundleId": "large_ha_2_0",
                "name": "Large with High Availability",
                "price": 230.0,
                "ramSizeInGb": 8.0,
                "diskSizeInGb": 240,
                "transferPerMonthInGb": 200,
                "cpuCount": 2,
                "isEncrypted": true,
                "isActive": true
            }
        ]
    }

For more information, see `Creating a database in Amazon Lightsail <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-creating-a-database>`__ in the *Amazon Lightsail Developer Guide*.
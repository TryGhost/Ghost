**To get the bundles for new instances**

The following ``get-bundles`` example displays details about all of the available bundles that can be used to create new instances in Amazon Lightsail. ::

    aws lightsail get-bundles

Output::

    {
        "bundles": [
            {
                "price": 5.0,
                "cpuCount": 2,
                "diskSizeInGb": 20,
                "bundleId": "nano_3_0",
                "instanceType": "nano",
                "isActive": true,
                "name": "Nano",
                "power": 298,
                "ramSizeInGb": 0.5,
                "transferPerMonthInGb": 1024,
                "supportedPlatforms": [
                    "LINUX_UNIX"
                ]
            },
            {
                "price": 7.0,
                "cpuCount": 2,
                "diskSizeInGb": 40,
                "bundleId": "micro_3_0",
                "instanceType": "micro",
                "isActive": true,
                "name": "Micro",
                "power": 500,
                "ramSizeInGb": 1.0,
                "transferPerMonthInGb": 2048,
                "supportedPlatforms": [
                    "LINUX_UNIX"
                ]
            },
            {
                "price": 12.0,
                "cpuCount": 2,
                "diskSizeInGb": 60,
                "bundleId": "small_3_0",
                "instanceType": "small",
                "isActive": true,
                "name": "Small",
                "power": 1000,
                "ramSizeInGb": 2.0,
                "transferPerMonthInGb": 3072,
                "supportedPlatforms": [
                    "LINUX_UNIX"
                ]
            },
            ...
            }
        ]
    }
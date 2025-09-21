**To get a device definition**

The following ``get-device-definition`` example retrieves information about the specified device definition. To retrieve the IDs of your device definitions, use the ``list-device-definitions`` command. ::

    aws greengrass get-device-definition \
        --device-definition-id "f9ba083d-5ad4-4534-9f86-026a45df1ccd"

Output::

    {
        "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/f9ba083d-5ad4-4534-9f86-026a45df1ccd/versions/83c13984-6fed-447e-84d5-5b8aa45d5f71",
        "Name": "TemperatureSensors",
        "tags": {},
        "LastUpdatedTimestamp": "2019-09-11T00:19:03.698Z",
        "LatestVersion": "83c13984-6fed-447e-84d5-5b8aa45d5f71",
        "CreationTimestamp": "2019-09-11T00:11:06.197Z",
        "Id": "f9ba083d-5ad4-4534-9f86-026a45df1ccd",
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/f9ba083d-5ad4-4534-9f86-026a45df1ccd"
    }

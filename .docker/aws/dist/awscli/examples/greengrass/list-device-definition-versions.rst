**To list the versions of a device definition**

The following ``list-device-definition-versions`` example displays the device definition versions associated with the specified device definition.  ::

    aws greengrass list-device-definition-versions \
        --device-definition-id "f9ba083d-5ad4-4534-9f86-026a45df1ccd"

Output::

    {
        "Versions": [
            {
                "Version": "83c13984-6fed-447e-84d5-5b8aa45d5f71",
                "CreationTimestamp": "2019-09-11T00:15:09.838Z",
                "Id": "f9ba083d-5ad4-4534-9f86-026a45df1ccd",
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/f9ba083d-5ad4-4534-9f86-026a45df1ccd/versions/83c13984-6fed-447e-84d5-5b8aa45d5f71"
            },
            {
                "Version": "3b5cc510-58c1-44b5-9d98-4ad858ffa795",
                "CreationTimestamp": "2019-09-11T00:11:06.197Z",
                "Id": "f9ba083d-5ad4-4534-9f86-026a45df1ccd",
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/f9ba083d-5ad4-4534-9f86-026a45df1ccd/versions/3b5cc510-58c1-44b5-9d98-4ad858ffa795"
            }
        ]
    }

**To list your device definitions**

The following ``list-device-definitions`` example displays details about the device definitions in your AWS account in the specified AWS Region. ::

    aws greengrass list-device-definitions \
        --region us-west-2

Output::

    {
        "Definitions": [
            {
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/50f3274c-3f0a-4f57-b114-6f46085281ab/versions/c777b0f5-1059-449b-beaa-f003ebc56c34",
                "LastUpdatedTimestamp": "2019-06-14T15:42:09.059Z",
                "LatestVersion": "c777b0f5-1059-449b-beaa-f003ebc56c34",
                "CreationTimestamp": "2019-06-14T15:42:09.059Z",
                "Id": "50f3274c-3f0a-4f57-b114-6f46085281ab",
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/50f3274c-3f0a-4f57-b114-6f46085281ab"
            },
            {
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/e01951c9-6134-479a-969a-1a15cac11c40/versions/514d57aa-4ee6-401c-9fac-938a9f7a51e5",
                "Name": "TestDeviceDefinition",
                "LastUpdatedTimestamp": "2019-04-16T23:17:43.245Z",
                "LatestVersion": "514d57aa-4ee6-401c-9fac-938a9f7a51e5",
                "CreationTimestamp": "2019-04-16T23:17:43.245Z",
                "Id": "e01951c9-6134-479a-969a-1a15cac11c40",
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/e01951c9-6134-479a-969a-1a15cac11c40"
            },
            {
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/f9ba083d-5ad4-4534-9f86-026a45df1ccd/versions/83c13984-6fed-447e-84d5-5b8aa45d5f71",
                "Name": "TemperatureSensors",
                "LastUpdatedTimestamp": "2019-09-10T00:19:03.698Z",
                "LatestVersion": "83c13984-6fed-447e-84d5-5b8aa45d5f71",
                "CreationTimestamp": "2019-09-11T00:11:06.197Z",
                "Id": "f9ba083d-5ad4-4534-9f86-026a45df1ccd",
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/f9ba083d-5ad4-4534-9f86-026a45df1ccd"
            }
        ]
    }

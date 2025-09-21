**To list the resources that are defined**

The following ``list-resource-definitions`` example lists the resources that are defined for AWS IoT Greengrass to use. ::

    aws greengrass list-resource-definitions
    
Output::

    {
        "Definitions": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/ad8c101d-8109-4b0e-b97d-9cc5802ab658",
                "CreationTimestamp": "2019-06-19T16:40:59.261Z",
                "Id": "ad8c101d-8109-4b0e-b97d-9cc5802ab658",
                "LastUpdatedTimestamp": "2019-06-19T16:40:59.261Z",
                "LatestVersion": "26e8829a-491a-464d-9c87-664bf6f6f2be",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/ad8c101d-8109-4b0e-b97d-9cc5802ab658/versions/26e8829a-491a-464d-9c87-664bf6f6f2be"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/c8bb9ebc-c3fd-40a4-9c6a-568d75569d38",
                "CreationTimestamp": "2019-06-19T21:51:28.212Z",
                "Id": "c8bb9ebc-c3fd-40a4-9c6a-568d75569d38",
                "LastUpdatedTimestamp": "2019-06-19T21:51:28.212Z",
                "LatestVersion": "a5f94d0b-f6bc-40f4-bb78-7a1c5fe13ba1",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/c8bb9ebc-c3fd-40a4-9c6a-568d75569d38/versions/a5f94d0b-f6bc-40f4-bb78-7a1c5fe13ba1",
                "Name": "MyGreengrassResources"
            }
        ]
    }

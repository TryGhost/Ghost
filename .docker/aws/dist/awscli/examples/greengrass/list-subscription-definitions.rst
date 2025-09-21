**To get a list subscription definitions**

The following ``list-subscription-definitions`` example lists all of the AWS IoT Greengrass subscriptions that are defined in your AWS account. ::

    aws greengrass list-subscription-definitions

Output::

    {
        "Definitions": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/70e49321-83d5-45d2-bc09-81f4917ae152",
                "CreationTimestamp": "2019-06-18T17:03:52.392Z",
                "Id": "70e49321-83d5-45d2-bc09-81f4917ae152",
                "LastUpdatedTimestamp": "2019-06-18T17:03:52.392Z",
                "LatestVersion": "88ae8699-12ac-4663-ba3f-4d7f0519140b",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/70e49321-83d5-45d2-bc09-81f4917ae152/versions/88ae8699-12ac-4663-ba3f-4d7f0519140b"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/cd6f1c37-d9a4-4e90-be94-01a7404f5967",
                "CreationTimestamp": "2018-10-18T15:45:34.024Z",
                "Id": "cd6f1c37-d9a4-4e90-be94-01a7404f5967",
                "LastUpdatedTimestamp": "2018-10-18T15:45:34.024Z",
                "LatestVersion": "d1cf8fac-284f-4f6a-98fe-a2d36d089373",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/cd6f1c37-d9a4-4e90-be94-01a7404f5967/versions/d1cf8fac-284f-4f6a-98fe-a2d36d089373"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/fa81bc84-3f59-4377-a84b-5d0134da359b",
                "CreationTimestamp": "2018-10-22T17:09:31.429Z",
                "Id": "fa81bc84-3f59-4377-a84b-5d0134da359b",
                "LastUpdatedTimestamp": "2018-10-22T17:09:31.429Z",
                "LatestVersion": "086d1b08-b25a-477c-a16f-6f9b3a9c295a",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/fa81bc84-3f59-4377-a84b-5d0134da359b/versions/086d1b08-b25a-477c-a16f-6f9b3a9c295a"
            }
        ]
    }

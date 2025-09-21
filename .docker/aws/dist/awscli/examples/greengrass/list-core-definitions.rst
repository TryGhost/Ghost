**To list Greengrass core definitions**

The following ``list-core-definitions`` example lists all of the Greengrass core definitions for your AWS account. ::

    aws greengrass list-core-definitions
    
Output::

    {
        "Definitions": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/0507843c-c1ef-4f06-b051-817030df7e7d",
                "CreationTimestamp": "2018-10-17T04:30:32.786Z",
                "Id": "0507843c-c1ef-4f06-b051-817030df7e7d",
                "LastUpdatedTimestamp": "2018-10-17T04:30:32.786Z",
                "LatestVersion": "bcdf9e86-3793-491e-93af-3cdfbf4e22b7",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/0507843c-c1ef-4f06-b051-817030df7e7d/versions/bcdf9e86-3793-491e-93af-3cdfbf4e22b7"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/31c22500-3509-4271-bafd-cf0655cda438",
                "CreationTimestamp": "2019-06-18T16:24:16.064Z",
                "Id": "31c22500-3509-4271-bafd-cf0655cda438",
                "LastUpdatedTimestamp": "2019-06-18T16:24:16.064Z",
                "LatestVersion": "2f350395-6d09-4c8a-8336-9ae5b57ace84",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/31c22500-3509-4271-bafd-cf0655cda438/versions/2f350395-6d09-4c8a-8336-9ae5b57ace84"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/c906ed39-a1e3-4822-a981-7b9bd57b4b46",
                "CreationTimestamp": "2019-06-18T16:21:21.351Z",
                "Id": "c906ed39-a1e3-4822-a981-7b9bd57b4b46",
                "LastUpdatedTimestamp": "2019-06-18T16:21:21.351Z",
                "LatestVersion": "42aeeac3-fd9d-4312-a8fd-ffa9404a20e0",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/c906ed39-a1e3-4822-a981-7b9bd57b4b46/versions/42aeeac3-fd9d-4312-a8fd-ffa9404a20e0"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/eaf280cb-138c-4d15-af36-6f681a1348f7",
                "CreationTimestamp": "2019-06-18T16:14:17.709Z",
                "Id": "eaf280cb-138c-4d15-af36-6f681a1348f7",
                "LastUpdatedTimestamp": "2019-06-18T16:14:17.709Z",
                "LatestVersion": "467c36e4-c5da-440c-a97b-084e62593b4c",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/eaf280cb-138c-4d15-af36-6f681a1348f7/versions/467c36e4-c5da-440c-a97b-084e62593b4c"
            }
        ]
    }

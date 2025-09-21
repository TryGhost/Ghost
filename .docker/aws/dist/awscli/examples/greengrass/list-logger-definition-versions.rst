**To get a list of versions of a logger definition**

The following ``list-logger-definition-versions`` example gets a list of all versions of the specified logger definition. ::

    aws greengrass list-logger-definition-versions \
        --logger-definition-id "49eeeb66-f1d3-4e34-86e3-3617262abf23"

Output::

    {
        "Versions": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/loggers/49eeeb66-f1d3-4e34-86e3-3617262abf23/versions/5e3f6f64-a565-491e-8de0-3c0d8e0f2073",
                "CreationTimestamp": "2019-05-08T16:10:13.866Z",
                "Id": "49eeeb66-f1d3-4e34-86e3-3617262abf23",
                "Version": "5e3f6f64-a565-491e-8de0-3c0d8e0f2073"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/loggers/49eeeb66-f1d3-4e34-86e3-3617262abf23/versions/3ec6d3af-eb85-48f9-a16d-1c795fe696d7",
                "CreationTimestamp": "2019-05-08T16:10:13.809Z",
                "Id": "49eeeb66-f1d3-4e34-86e3-3617262abf23",
                "Version": "3ec6d3af-eb85-48f9-a16d-1c795fe696d7"
            }
        ]
    }

**To get a list of logger definitions**

The following ``list-logger-definitions`` example lists all of the logger definitions for your AWS account. ::

    aws greengrass list-logger-definitions

Output::

    {
        "Definitions": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/loggers/49eeeb66-f1d3-4e34-86e3-3617262abf23",
                "CreationTimestamp": "2019-05-08T16:10:13.809Z",
                "Id": "49eeeb66-f1d3-4e34-86e3-3617262abf23",
                "LastUpdatedTimestamp": "2019-05-08T16:10:13.809Z",
                "LatestVersion": "5e3f6f64-a565-491e-8de0-3c0d8e0f2073",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/loggers/49eeeb66-f1d3-4e34-86e3-3617262abf23/versions/5e3f6f64-a565-491e-8de0-3c0d8e0f2073"
            }
        ]
    }
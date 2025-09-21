**To list the versions of a Lambda function**

The following ``list-function-definition-versions`` example lists all of the versions of the specified Lambda function. You can use the ``list-function-definitions`` command to get the ID. ::

    aws greengrass list-function-definition-versions \
        --function-definition-id "063f5d1a-1dd1-40b4-9b51-56f8993d0f85"

Output::

    {
        "Versions": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/063f5d1a-1dd1-40b4-9b51-56f8993d0f85/versions/9748fda7-1589-4fcc-ac94-f5559e88678b",
                "CreationTimestamp": "2019-06-18T17:04:30.776Z",
                "Id": "063f5d1a-1dd1-40b4-9b51-56f8993d0f85",
                "Version": "9748fda7-1589-4fcc-ac94-f5559e88678b"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/063f5d1a-1dd1-40b4-9b51-56f8993d0f85/versions/9b08df77-26f2-4c29-93d2-769715edcfec",
                "CreationTimestamp": "2019-06-18T17:02:44.087Z",
                "Id": "063f5d1a-1dd1-40b4-9b51-56f8993d0f85",
                "Version": "9b08df77-26f2-4c29-93d2-769715edcfec"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/063f5d1a-1dd1-40b4-9b51-56f8993d0f85/versions/4236239f-94f7-4b90-a2f8-2a24c829d21e",
                "CreationTimestamp": "2019-06-18T17:01:42.284Z",
                "Id": "063f5d1a-1dd1-40b4-9b51-56f8993d0f85",
                "Version": "4236239f-94f7-4b90-a2f8-2a24c829d21e"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/063f5d1a-1dd1-40b4-9b51-56f8993d0f85/versions/343408bb-549a-4fbe-b043-853643179a39",
                "CreationTimestamp": "2019-06-18T16:21:21.431Z",
                "Id": "063f5d1a-1dd1-40b4-9b51-56f8993d0f85",
                "Version": "343408bb-549a-4fbe-b043-853643179a39"
            }
        ]
    }

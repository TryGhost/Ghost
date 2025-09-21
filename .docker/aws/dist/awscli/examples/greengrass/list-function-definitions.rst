**To list Lambda functions**

The following ``list-function-definitions`` example lists all of the Lambda functions defined for your AWS account. ::

    aws greengrass list-function-definitions

Output::

    {
        "Definitions": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/017970a5-8952-46dd-b1c1-020b3ae8e960",
                "CreationTimestamp": "2018-10-17T04:30:32.884Z",
                "Id": "017970a5-8952-46dd-b1c1-020b3ae8e960",
                "LastUpdatedTimestamp": "2018-10-17T04:30:32.884Z",
                "LatestVersion": "4380b302-790d-4ed8-92bf-02e88afecb15",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/017970a5-8952-46dd-b1c1-020b3ae8e960/versions/4380b302-790d-4ed8-92bf-02e88afecb15"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/063f5d1a-1dd1-40b4-9b51-56f8993d0f85",
                "CreationTimestamp": "2019-06-18T16:21:21.431Z",
                "Id": "063f5d1a-1dd1-40b4-9b51-56f8993d0f85",
                "LastUpdatedTimestamp": "2019-06-18T16:21:21.431Z",
                "LatestVersion": "9748fda7-1589-4fcc-ac94-f5559e88678b",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/063f5d1a-1dd1-40b4-9b51-56f8993d0f85/versions/9748fda7-1589-4fcc-ac94-f5559e88678b"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/6598e653-a262-440c-9967-e2697f64da7b",
                "CreationTimestamp": "2019-06-18T16:24:16.123Z",
                "Id": "6598e653-a262-440c-9967-e2697f64da7b",
                "LastUpdatedTimestamp": "2019-06-18T16:24:16.123Z",
                "LatestVersion": "38bc6ccd-98a2-4ce7-997e-16c84748fae4",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/6598e653-a262-440c-9967-e2697f64da7b/versions/38bc6ccd-98a2-4ce7-997e-16c84748fae4"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/c668df84-fad2-491b-95f4-655d2cad7885",
                "CreationTimestamp": "2019-06-18T16:14:17.784Z",
                "Id": "c668df84-fad2-491b-95f4-655d2cad7885",
                "LastUpdatedTimestamp": "2019-06-18T16:14:17.784Z",
                "LatestVersion": "37dd68c4-a64f-40ba-aa13-71fecc3ebded",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/c668df84-fad2-491b-95f4-655d2cad7885/versions/37dd68c4-a64f-40ba-aa13-71fecc3ebded"
            }
        ]
    }

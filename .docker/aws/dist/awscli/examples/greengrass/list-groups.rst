**To list the Greengrass groups**

The following ``list-groups`` example lists all Greengrass groups that are defined in your AWS account. ::

    aws greengrass list-groups

Output::

    {
        "Groups": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731",
                "CreationTimestamp": "2019-06-18T16:21:21.457Z",
                "Id": "1013db12-8b58-45ff-acc7-704248f66731",
                "LastUpdatedTimestamp": "2019-06-18T16:21:21.457Z",
                "LatestVersion": "115136b3-cfd7-4462-b77f-8741a4b00e5e",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731/versions/115136b3-cfd7-4462-b77f-8741a4b00e5e",
                "Name": "GGGroup4Pi3"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1402daf9-71cf-4cfe-8be0-d5e80526d0d8",
                "CreationTimestamp": "2018-10-31T21:52:46.603Z",
                "Id": "1402daf9-71cf-4cfe-8be0-d5e80526d0d8",
                "LastUpdatedTimestamp": "2018-10-31T21:52:46.603Z",
                "LatestVersion": "749af901-60ab-456f-a096-91b12d983c29",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1402daf9-71cf-4cfe-8be0-d5e80526d0d8/versions/749af901-60ab-456f-a096-91b12d983c29",
                "Name": "MyTestGroup"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/504b5c8d-bbed-4635-aff1-48ec5b586db5",
                "CreationTimestamp": "2018-12-31T21:39:36.771Z",
                "Id": "504b5c8d-bbed-4635-aff1-48ec5b586db5",
                "LastUpdatedTimestamp": "2018-12-31T21:39:36.771Z",
                "LatestVersion": "46911e8e-f9bc-4898-8b63-59c7653636ec",
                "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/504b5c8d-bbed-4635-aff1-48ec5b586db5/versions/46911e8e-f9bc-4898-8b63-59c7653636ec",
                "Name": "smp-ggrass-group"
            }
        ]
    }

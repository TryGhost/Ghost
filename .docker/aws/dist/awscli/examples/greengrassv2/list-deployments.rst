**To list deployments**

The following ``list-deployments`` example lists the latest revision of each deployment defined in your AWS account in the current Region. ::

    aws greengrassv2 list-deployments

Output::

    {
        "deployments": [
            {
                "targetArn": "arn:aws:iot:us-west-2:123456789012:thinggroup/MyGreengrassCoreGroup",
                "revisionId": "14",
                "deploymentId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "deploymentName": "Deployment for MyGreengrassCoreGroup",
                "creationTimestamp": "2021-01-07T17:21:20.691000-08:00",
                "deploymentStatus": "ACTIVE",
                "isLatestForTarget": false
            },
            {
                "targetArn": "arn:aws:iot:us-west-2:123456789012:thing/MyGreengrassCore",
                "revisionId": "1",
                "deploymentId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "deploymentName": "Deployment for MyGreengrassCore",
                "creationTimestamp": "2021-01-06T16:10:42.407000-08:00",
                "deploymentStatus": "COMPLETED",
                "isLatestForTarget": false
            }
        ]
    }

For more information, see `Deploy components to devices <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-deployments.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.
**To update a custom game build**

The following ``update-build`` example changes the name and version information that is associated with a specified build resource. The returned build object verifies that the changes were made successfully. ::

    aws gamelift update-build \
        --build-id build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --name MegaFrogRaceServer.NA.east \
        --build-version 12345.east

Output::

    {
        "Build": {
            "BuildArn": "arn:aws:gamelift:us-west-2::build/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "BuildId": "build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111", 
            "CreationTime": 1496708916.18,
            "Name": "MegaFrogRaceServer.NA.east",
            "OperatingSystem": "AMAZON_LINUX_2",
            "SizeOnDisk": 1304924, 
            "Status": "READY", 
            "Version": "12345.east"
        }
    }

For more information, see `Update Your Build Files <https://docs.aws.amazon.com/gamelift/latest/developerguide/gamelift-build-cli-uploading.html#gamelift-build-cli-uploading-update-build-files>`__ in the *Amazon GameLift Developer Guide*.

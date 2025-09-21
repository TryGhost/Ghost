**To get information on a custom game build**

The following ``describe-build`` example retrieves properties for a game server build resource. ::

    aws gamelift describe-build \
        --build-id build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "Build": {
            "BuildArn": "arn:aws:gamelift:us-west-2::build/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "BuildId": "build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111", 
            "CreationTime": 1496708916.18, 
            "Name": "My_Game_Server_Build_One", 
            "OperatingSystem": "AMAZON_LINUX", 
            "SizeOnDisk": 1304924, 
            "Status": "READY", 
            "Version": "12345.678"
        }
    }

For more information, see `Upload a Custom Server Build to GameLift <https://docs.aws.amazon.com/gamelift/latest/developerguide/gamelift-build-cli-uploading.html#gamelift-build-cli-uploading-builds>`__ in the *Amazon GameLift Developer Guide*.

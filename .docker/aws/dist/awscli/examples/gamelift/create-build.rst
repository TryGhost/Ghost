**Example1: To create a game build from files in an S3 bucket**

The following ``create-build`` example creates a custom game build resource. It uses zipped files that are stored in an S3 location in an AWS account that you control. This example assumes that you've already created an IAM role that gives Amazon GameLift permission to access the S3 location. Since the request does not specify an operating system, the new build resource defaults to WINDOWS_2012. ::

    aws gamelift create-build \
        --storage-location file://storage-loc.json \ 
        --name MegaFrogRaceServer.NA \
        --build-version 12345.678

Contents of ``storage-loc.json``::

    {
        "Bucket":"MegaFrogRaceServer_NA_build_files"
        "Key":"MegaFrogRaceServer_build_123.zip"
        "RoleArn":"arn:aws:iam::123456789012:role/gamelift"
    }

Output:: 

    {
        "Build": {
            "BuildArn": "arn:aws:gamelift:us-west-2::build/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "BuildId": "build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "CreationTime": 1496708916.18, 
            "Name": "MegaFrogRaceServer.NA", 
            "OperatingSystem": "WINDOWS_2012", 
            "SizeOnDisk": 479303, 
            "Status": "INITIALIZED", 
            "Version": "12345.678"
        },
        "StorageLocation": {
            "Bucket": "MegaFrogRaceServer_NA_build_files", 
            "Key": "MegaFrogRaceServer_build_123.zip"
        }
    }

**Example2: To create a game build resource for manually uploading files to GameLift**

The following ``create-build`` example creates a new build resource. It also gets a storage location and temporary credentials that allow you to manually upload your game build to the GameLift location in Amazon S3. Once you've successfully uploaded your build, the GameLift service validates the build and updates the new build's status. ::

    aws gamelift create-build \
        --name MegaFrogRaceServer.NA \
        --build-version 12345.678 \
        --operating-system AMAZON_LINUX

Output::

    {
        "Build": {
            "BuildArn": "arn:aws:gamelift:us-west-2::build/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "BuildId": "build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111", 
            "CreationTime": 1496708916.18, 
            "Name": "MegaFrogRaceServer.NA", 
            "OperatingSystem": "AMAZON_LINUX", 
            "SizeOnDisk": 0, 
            "Status": "INITIALIZED", 
            "Version": "12345.678"
        }, 
        "StorageLocation": {
            "Bucket": "gamelift-builds-us-west-2", 
            "Key": "123456789012/build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
        }, 
        "UploadCredentials": {
            "AccessKeyId": "AKIAIOSFODNN7EXAMPLE", 
            "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", 
            "SessionToken": "AgoGb3JpZ2luENz...EXAMPLETOKEN=="
        }
    }

For more information, see `Upload a Custom Server Build to GameLift <https://docs.aws.amazon.com/gamelift/latest/developerguide/gamelift-build-cli-uploading.html>`__ in the *Amazon GameLift Developer Guide*.

**To refresh access credentials for uploading a build**

The following ``create-build`` example obtains new, valid access credentials for uploading a GameLift build file to an Amazon S3 location. Credentials have a limited life span. You get the build ID from the response to the original ``CreateBuild`` request. ::

    aws gamelift request-upload-credentials \
        --build-id build-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output:: 

    {
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

**To display details about a signing job**

The following ``describe-signing-job`` example displays details about the specified signing job. ::

    aws signer describe-signing-job \
        --job-id 2065c468-73e2-4385-a6c9-0123456789abc

Output::

    {
        "status": "Succeeded",
        "completedAt": 1568412037,
        "platformId": "AmazonFreeRTOS-Default",
        "signingMaterial": {
            "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/6a55389b-306b-4e8c-a95c-0123456789abc"
        },
        "statusReason": "Signing Succeeded",
        "jobId": "2065c468-73e2-4385-a6c9-0123456789abc",
        "source": {
            "s3": {
                "version": "PNyFaUTgsQh5ZdMCcoCe6pT1gOpgB_M4",
                "bucketName": "signer-source",
                "key": "MyCode.rb"
            }
        },
        "profileName": "MyProfile2",
        "signedObject": {
            "s3": {
                "bucketName": "signer-destination",
                "key": "signed-2065c468-73e2-4385-a6c9-0123456789abc"
            }
        },
        "requestedBy": "arn:aws:iam::123456789012:user/maria",
        "createdAt": 1568412036
    }

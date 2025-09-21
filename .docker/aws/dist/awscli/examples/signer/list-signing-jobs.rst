**To list all signing jobs**

The following ``list-signing-jobs`` example displays details about all signing jobs for the account. ::

    aws signer list-signing-jobs

In this example, two jobs are returned, one successful, and one failed. ::

    {
        "jobs": [
            {
                "status": "Succeeded",
                "signingMaterial": {
                    "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/6a55389b-306b-4e8c-a95c-0123456789abc"
                },
                "jobId": "2065c468-73e2-4385-a6c9-0123456789abc",
                "source": {
                    "s3": {
                        "version": "PNyFaUTgsQh5ZdMCcoCe6pT1gOpgB_M4",
                        "bucketName": "signer-source",
                        "key": "MyCode.rb"
                    }
                },
                "signedObject": {
                    "s3": {
                        "bucketName": "signer-destination",
                        "key": "signed-2065c468-73e2-4385-a6c9-0123456789abc"
                    }
                },
                "createdAt": 1568412036
            },
            {
                "status": "Failed",
                "source": {
                    "s3": {
                        "version": "PNyFaUTgsQh5ZdMCcoCe6pT1gOpgB_M4",
                        "bucketName": "signer-source",
                        "key": "MyOtherCode.rb"
                    }
                },
                "signingMaterial": {
                    "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/6a55389b-306b-4e8c-a95c-0123456789abc"
                },
                "createdAt": 1568402690,
                "jobId": "74d9825e-22fc-4a0d-b962-0123456789abc"
            }
        ]
    }

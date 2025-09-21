**To list image build versions**

The following ``list-image-build-versions`` example lists all of the image build versions with a semantic version. ::

    aws imagebuilder list-image-build-versions \
        --image-version-arn arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "imageSummaryList": [
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03/7",
                "name": "MyBasicRecipe",
                "version": "2019.12.03/7",
                "platform": "Windows",
                "state": {
                    "status": "FAILED",
                    "reason": "Can't start SSM Automation for arn arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03/7 during building. Parameter \"iamInstanceProfileName\" has a null value."
                },
                "owner": "123456789012",
                "dateCreated": "2020-02-19T18:56:11.511Z",
                "outputResources": {
                    "amis": []
                },
                "tags": {}
            },
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03/6",
                "name": "MyBasicRecipe",
                "version": "2019.12.03/6",
                "platform": "Windows",
                "state": {
                    "status": "FAILED",
                    "reason": "An internal error has occurred."
                },
                "owner": "123456789012",
                "dateCreated": "2020-02-18T22:49:08.142Z",
                "outputResources": {
                    "amis": [
                        {
                            "region": "us-west-2",
                            "image": "ami-a1b2c3d4567890ab",
                            "name": "MyBasicRecipe 2020-02-18T22-49-38.704Z",
                            "description": "This example image recipe creates a Windows 2016 image."
                        },
                        {
                            "region": "us-west-2",
                            "image": "ami-a1b2c3d4567890ab",
                            "name": "Name 2020-02-18T22-49-08.131Z",
                            "description": "Copies AMI to eu-west-2 and exports to S3"
                        },
                        {
                            "region": "eu-west-2",
                            "image": "ami-a1b2c3d4567890ab",
                            "name": "My 6 image 2020-02-18T22-49-08.131Z",
                            "description": "Copies AMI to eu-west-2 and exports to S3"
                        }
                    ]
                },
                "tags": {}
            },
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03/5",
                "name": "MyBasicRecipe",
                "version": "2019.12.03/5",
                "platform": "Windows",
                "state": {
                    "status": "AVAILABLE"
                },
                "owner": "123456789012",
                "dateCreated": "2020-02-18T16:51:48.403Z",
                "outputResources": {
                    "amis": [
                        {
                            "region": "us-west-2",
                            "image": "ami-a1b2c3d4567890ab",
                            "name": "MyBasicRecipe 2020-02-18T16-52-18.965Z",
                            "description": "This example image recipe creates a Windows 2016 image."
                        }
                    ]
                },
                "tags": {}
            },
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03/4",
                "name": "MyBasicRecipe",
                "version": "2019.12.03/4",
                "platform": "Windows",
                "state": {
                    "status": "AVAILABLE"
                },
                "owner": "123456789012",
                "dateCreated": "2020-02-18T16:50:01.827Z",
                "outputResources": {
                    "amis": [
                        {
                            "region": "us-west-2",
                            "image": "ami-a1b2c3d4567890ab",
                            "name": "MyBasicRecipe 2020-02-18T16-50-32.280Z",
                            "description": "This example image recipe creates a Windows 2016 image."
                        }
                    ]
                },
                "tags": {}
            },
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03/3",
                "name": "MyBasicRecipe",
                "version": "2019.12.03/3",
                "platform": "Windows",
                "state": {
                    "status": "AVAILABLE"
                },
                "owner": "123456789012",
                "dateCreated": "2020-02-14T23:14:13.597Z",
                "outputResources": {
                    "amis": [
                        {
                            "region": "us-west-2",
                            "image": "ami-a1b2c3d4567890ab",
                            "name": "MyBasicRecipe 2020-02-14T23-14-44.243Z",
                            "description": "This example image recipe creates a Windows 2016 image."
                        }
                    ]
                },
                "tags": {}
            },
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03/2",
                "name": "MyBasicRecipe",
                "version": "2019.12.03/2",
                "platform": "Windows",
                "state": {
                    "status": "FAILED",
                    "reason": "SSM execution 'a1b2c3d4-5678-90ab-cdef-EXAMPLE11111' failed with status = 'Failed' and failure message = 'Step fails when it is verifying the command has completed. Command a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 returns unexpected invocation result: \n{Status=[Failed], ResponseCode=[1], Output=[\n----------ERROR-------\nfailed to run commands: exit status 1], OutputPayload=[{\"Status\":\"Failed\",\"ResponseCode\":1,\"Output\":\"\\n----------ERROR-------\\nfailed to run commands: exit status 1\",\"CommandId\":\"a1b2c3d4-5678-90ab-cdef-EXAMPLE11111\"}], CommandId=[a1b2c3d4-5678-90ab-cdef-EXAMPLE11111]}. Please refer to Automation Service Troubleshooting Guide for more diagnosis details.'"
                },
                "owner": "123456789012",
                "dateCreated": "2020-02-14T22:57:42.593Z",
                "outputResources": {
                    "amis": []
                },
                "tags": {}
            }
        ]
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.

**To get image details**

The following ``get-image`` example lists the details of an image by specifying its ARN. ::

    aws imagebuilder get-image \
        --image-build-version-arn arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03/1

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "image": {
            "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image/mybasicrecipe/2019.12.03/1",
            "name": "MyBasicRecipe",
            "version": "2019.12.03/1",
            "platform": "Windows",
            "state": {
                "status": "BUILDING"
            },
            "imageRecipe": {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image-recipe/mybasicrecipe/2019.12.03",
                "name": "MyBasicRecipe",
                "description": "This example image recipe creates a Windows 2016 image.",
                "platform": "Windows",
                "version": "2019.12.03",
                "components": [
                    {
                        "componentArn": "arn:aws:imagebuilder:us-west-2:123456789012:component/myexamplecomponent/2019.12.02/1"
                    },
                    {
                        "componentArn": "arn:aws:imagebuilder:us-west-2:123456789012:component/myimportedcomponent/1.0.0/1"
                    }
                ],
                "parentImage": "arn:aws:imagebuilder:us-west-2:aws:image/windows-server-2016-english-full-base-x86/2019.12.17/1",
                "dateCreated": "2020-02-14T19:46:16.904Z",
                "tags": {}
            },
            "infrastructureConfiguration": {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:infrastructure-configuration/myexampleinfrastructure",
                "name": "MyExampleInfrastructure",
                "description": "An example that will retain instances of failed builds",
                "instanceTypes": [
                    "m5.large",
                    "m5.xlarge"
                ],
                "instanceProfileName": "EC2InstanceProfileForImageFactory",
                "securityGroupIds": [
                    "sg-a1b2c3d4"
                ],
                "subnetId": "subnet-a1b2c3d4",
                "logging": {
                    "s3Logs": {
                        "s3BucketName": "bucket-name",
                        "s3KeyPrefix": "bucket-path"
                    }
                },
                "keyPair": "Sam",
                "terminateInstanceOnFailure": false,
                "snsTopicArn": "arn:aws:sns:us-west-2:123456789012:sns-name",
                "dateCreated": "2020-02-14T21:21:05.098Z",
                "tags": {}
            },
            "imageTestsConfiguration": {
                "imageTestsEnabled": true,
                "timeoutMinutes": 720
            },
            "dateCreated": "2020-02-14T23:14:13.597Z",
            "outputResources": {
                "amis": []
            },
            "tags": {}
        }
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.

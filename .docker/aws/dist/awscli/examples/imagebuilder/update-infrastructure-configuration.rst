**To update an infrastructure configuration**

The following ``update-infrastructure-configuration`` example updates an infrastructure configuration using a JSON file. ::

    aws imagebuilder update-infrastructure-configuration \
        --cli-input-json file:/update-infrastructure-configuration.json

Contents of ``update-infrastructure-configuration.json``::

    {
        "infrastructureConfigurationArn": "arn:aws:imagebuilder:us-west-2:123456789012:infrastructure-configuration/myexampleinfrastructure",
        "description": "An example that will terminate instances of failed builds",
        "instanceTypes": [
            "m5.large", "m5.2xlarge"
        ],
        "instanceProfileName": "EC2InstanceProfileForImageFactory",
        "securityGroupIds": [
            "sg-a48c95ef"
        ],
        "subnetId": "subnet-a48c95ef",
        "logging": {
            "s3Logs": {
                "s3BucketName": "bucket-name",
                "s3KeyPrefix": "bucket-path"
            }
        },
        "terminateInstanceOnFailure": true,
        "snsTopicArn": "arn:aws:sns:us-west-2:123456789012:sns-name"
    }

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.

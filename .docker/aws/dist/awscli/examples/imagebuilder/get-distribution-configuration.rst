**To get the details of a distribution configuration**

The following ``get-distribution-configuration`` example displays the details of a distribution configuration by specifying its ARN. ::

    aws imagebuilder get-distribution-configuration \
        --distribution-configuration-arn arn:aws:imagebuilder:us-west-2:123456789012:distribution-configuration/myexampledistribution

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "distributionConfiguration": {
            "arn": "arn:aws:imagebuilder:us-west-2:123456789012:distribution-configuration/myexampledistribution",
            "name": "MyExampleDistribution",
            "description": "Copies AMI to eu-west-1 and exports to S3",
            "distributions": [
                {
                    "region": "us-west-2",
                    "amiDistributionConfiguration": {
                        "name": "Name {{imagebuilder:buildDate}}",
                        "description": "An example image name with parameter references",
                        "amiTags": {
                            "KeyName": "{{ssm:parameter_name}}"
                        },
                        "launchPermission": {
                            "userIds": [
                                "123456789012"
                            ]
                        }
                    }
                },
                {
                    "region": "eu-west-1",
                    "amiDistributionConfiguration": {
                        "name": "My {{imagebuilder:buildVersion}} image {{imagebuilder:buildDate}}",
                        "amiTags": {
                            "KeyName": "Value"
                        },
                        "launchPermission": {
                            "userIds": [
                                "123456789012"
                            ]
                        }
                    }
                }
            ],
            "dateCreated": "2020-02-19T18:40:10.529Z",
            "tags": {}
        }
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.

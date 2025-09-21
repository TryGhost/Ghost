**To update a distribution configuration**

The following ``update-distribution-configuration`` example updates a distribution configuration using a JSON file. ::

    aws imagebuilder update-distribution-configuration \
        --cli-input-json file://update-distribution-configuration.json

Contents of ``update-distribution-configuration.json``::

    {
        "distributionConfigurationArn": "arn:aws:imagebuilder:us-west-2:123456789012:distribution-configuration/myexampledistribution",
        "description": "Copies AMI to eu-west-2 and exports to S3",
        "distributions": [
            {
                "region": "us-west-2",
                "amiDistributionConfiguration": {
                    "name": "Name {{imagebuilder:buildDate}}",
                    "description": "An example image name with parameter references"    
                }
            },
            {
                "region": "eu-west-2",
                "amiDistributionConfiguration": {
                    "name": "My {{imagebuilder:buildVersion}} image {{imagebuilder:buildDate}}"    
                }
            }
        ]
    }

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.

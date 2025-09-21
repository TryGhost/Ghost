**To list distributions**

The following ``list-distribution-configurations`` example lists all of your distributions. ::

    aws imagebuilder list-distribution-configurations

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "distributionConfigurationSummaryList": [
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:distribution-configuration/myexampledistribution",
                "name": "MyExampleDistribution",
                "description": "Copies AMI to eu-west-1 and exports to S3",
                "dateCreated": "2020-02-19T18:40:10.529Z",
                "tags": {
                    "KeyName": "KeyValue"
                }
            }
        ]
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.

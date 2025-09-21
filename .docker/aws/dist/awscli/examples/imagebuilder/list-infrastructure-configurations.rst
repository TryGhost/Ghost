**To list infrastructure configurations**

The following ``list-infrastructure-configurations`` example lists all of your infrastructure configurations. ::

    aws imagebuilder list-infrastructure-configurations

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "infrastructureConfigurationSummaryList": [
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:infrastructure-configuration/myexampleinfrastructure",
                "name": "MyExampleInfrastructure",
                "description": "An example that will retain instances of failed builds",
                "dateCreated": "2020-02-19T19:11:51.858Z",
                "tags": {}
            },
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:infrastructure-configuration/infrastructureconfiguration-name-a1b2c3d45678",
                "name": "infrastructureConfiguration-name-a1b2c3d45678",
                "dateCreated": "2019-12-16T18:19:01.038Z",
                "tags": {
                    "KeyName": "KeyValue"
                }
            }
        ]
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.

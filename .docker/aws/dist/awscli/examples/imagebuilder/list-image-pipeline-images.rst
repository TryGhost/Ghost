**To list image pipeline pipeline images**

The following ``list-image-pipeline-images`` example lists all images that were created by a specific image pipeline. ::

    aws imagebuilder list-image-pipeline-images \
        --image-pipeline-arn arn:aws:imagebuilder:us-west-2:123456789012:image-pipeline/mywindows2016pipeline

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "imagePipelineList": [
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image-pipeline/mywindows2016pipeline",
                "name": "MyWindows2016Pipeline",
                "description": "Builds Windows 2016 Images",
                "platform": "Windows",
                "imageRecipeArn": "arn:aws:imagebuilder:us-west-2:123456789012:image-recipe/mybasicrecipe/2019.12.03",
                "infrastructureConfigurationArn": "arn:aws:imagebuilder:us-west-2:123456789012:infrastructure-configuration/myexampleinfrastructure",
                "distributionConfigurationArn": "arn:aws:imagebuilder:us-west-2:123456789012:distribution-configuration/myexampledistribution",
                "imageTestsConfiguration": {
                    "imageTestsEnabled": true,
                    "timeoutMinutes": 60
                },
                "schedule": {
                    "scheduleExpression": "cron(0 0 * * SUN)",
                    "pipelineExecutionStartCondition": "EXPRESSION_MATCH_AND_DEPENDENCY_UPDATES_AVAILABLE"
                },
                "status": "ENABLED",
                "dateCreated": "2020-02-19T19:04:01.253Z",
                "dateUpdated": "2020-02-19T19:04:01.253Z",
                "tags": {
                    "KeyName": "KeyValue"
                }
            },
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:image-pipeline/sam",
                "name": "PipelineName",
                "platform": "Linux",
                "imageRecipeArn": "arn:aws:imagebuilder:us-west-2:123456789012:image-recipe/recipe-name-a1b2c3d45678/1.0.0",
                "infrastructureConfigurationArn": "arn:aws:imagebuilder:us-west-2:123456789012:infrastructure-configuration/infrastructureconfiguration-name-a1b2c3d45678",
                "imageTestsConfiguration": {
                    "imageTestsEnabled": true,
                    "timeoutMinutes": 720
                },
                "status": "ENABLED",
                "dateCreated": "2019-12-16T18:19:02.068Z",
                "dateUpdated": "2019-12-16T18:19:02.068Z",
                "tags": {
                    "KeyName": "KeyValue"
                }
            }
        ]
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.

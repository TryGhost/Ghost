**To list the available deployments**

The following ``list-deployments`` example lists the available deployments in your AWS account for the specified application and environment. ::

    aws appconfig list-deployments \
        --application-id 339ohji \
        --environment-id 54j1r29

Output::

    {
        "Items": [
            {
                "DeploymentNumber": 1,
                "ConfigurationName": "Example-Configuration-Profile",
                "ConfigurationVersion": "1",
                "DeploymentDurationInMinutes": 15,
                "GrowthType": "LINEAR",
                "GrowthFactor": 25.0,
                "FinalBakeTimeInMinutes": 0,
                "State": "COMPLETE",
                "PercentageComplete": 100.0,
                "StartedAt": "2021-09-17T21:43:54.205000+00:00",
                "CompletedAt": "2021-09-17T21:59:03.888000+00:00"
            }
        ]
    }

For more information, see `Step 5: Deploying a configuration <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-deploying.html>`__ in the *AWS AppConfig User Guide*.
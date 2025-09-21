**To retrieve deployment details**

The following ``get-deployment`` example lists details of the deployment to the application in the specified environment and deployment. ::

    aws appconfig get-deployment \
        --application-id 339ohji \
        --environment-id 54j1r29 \
        --deployment-number 1

Output::

    {
        "ApplicationId": "339ohji",
        "EnvironmentId": "54j1r29",
        "DeploymentStrategyId": "1225qzk",
        "ConfigurationProfileId": "ur8hx2f",
        "DeploymentNumber": 1,
        "ConfigurationName": "Example-Configuration-Profile",
        "ConfigurationLocationUri": "ssm-parameter://Example-Parameter",
        "ConfigurationVersion": "1",
        "DeploymentDurationInMinutes": 15,
        "GrowthType": "LINEAR",
        "GrowthFactor": 25.0,
        "FinalBakeTimeInMinutes": 0,
        "State": "COMPLETE",
        "EventLog": [
            {
                "EventType": "DEPLOYMENT_COMPLETED",
                "TriggeredBy": "APPCONFIG",
                "Description": "Deployment completed",
                "OccurredAt": "2021-09-17T21:59:03.888000+00:00"
            },
            {
                "EventType": "BAKE_TIME_STARTED",
                "TriggeredBy": "APPCONFIG",
                "Description": "Deployment bake time started",
                "OccurredAt": "2021-09-17T21:58:57.722000+00:00"
            },
            {
                "EventType": "PERCENTAGE_UPDATED",
                "TriggeredBy": "APPCONFIG",
                "Description": "Configuration available to 100.00% of clients",
                "OccurredAt": "2021-09-17T21:55:56.816000+00:00"
            },
            {
                "EventType": "PERCENTAGE_UPDATED",
                "TriggeredBy": "APPCONFIG",
                "Description": "Configuration available to 75.00% of clients",
                "OccurredAt": "2021-09-17T21:52:56.567000+00:00"
            },
            {
                "EventType": "PERCENTAGE_UPDATED",
                "TriggeredBy": "APPCONFIG",
                "Description": "Configuration available to 50.00% of clients",
                "OccurredAt": "2021-09-17T21:49:55.737000+00:00"
            },
            {
                "EventType": "PERCENTAGE_UPDATED",
                "TriggeredBy": "APPCONFIG",
                "Description": "Configuration available to 25.00% of clients",
                "OccurredAt": "2021-09-17T21:46:55.187000+00:00"
            },
            {
                "EventType": "DEPLOYMENT_STARTED",
                "TriggeredBy": "USER",
                "Description": "Deployment started",
                "OccurredAt": "2021-09-17T21:43:54.205000+00:00"
            }
        ],
        "PercentageComplete": 100.0,
        "StartedAt": "2021-09-17T21:43:54.205000+00:00",
        "CompletedAt": "2021-09-17T21:59:03.888000+00:00"
    }

For more information, see `Step 5: Deploying a configuration <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-deploying.html>`__ in the *AWS AppConfig User Guide*.
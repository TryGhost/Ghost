**To start a configuration deployment**

The following ``start-deployment`` example starts a deployment to the application using the specified environment, deployment strategy, and configuration profile. ::

    aws appconfig start-deployment \
        --application-id 339ohji \
        --environment-id 54j1r29 \
        --deployment-strategy-id 1225qzk \
        --configuration-profile-id ur8hx2f \
        --configuration-version 1

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
        "State": "DEPLOYING",
        "EventLog": [
            {
                "EventType": "DEPLOYMENT_STARTED",
                "TriggeredBy": "USER",
                "Description": "Deployment started",
                "OccurredAt": "2021-09-17T21:43:54.205000+00:00"
            }
        ],
        "PercentageComplete": 0.0,
        "StartedAt": "2021-09-17T21:43:54.205000+00:00"
    }

For more information, see `Step 5: Deploying a configuration <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-deploying.html>`__ in the *AWS AppConfig User Guide*.
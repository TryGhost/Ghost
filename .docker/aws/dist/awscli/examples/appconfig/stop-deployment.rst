**To stop configuration deployment**

The following ``stop-deployment`` example stops the deployment of an application configuration to the specified environment. ::

    aws appconfig stop-deployment \
        --application-id 339ohji \
        --environment-id 54j1r29 \
        --deployment-number 2

Output::

    {
        "DeploymentNumber": 0,
        "DeploymentDurationInMinutes": 0,
        "GrowthFactor": 0.0,
        "FinalBakeTimeInMinutes": 0,
        "PercentageComplete": 0.0
    }

For more information, see `Step 5: Deploying a configuration <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-deploying.html>`__ in the *AWS AppConfig User Guide*.
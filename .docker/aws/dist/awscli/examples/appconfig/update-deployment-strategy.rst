**To update a deployment strategy**

The following ``update-deployment-strategy`` example updates final bake time to 20 minutes in the specified deployment strategy. ::

    aws appconfig update-deployment-strategy \
        --deployment-strategy-id 1225qzk \
        --final-bake-time-in-minutes 20

Output::

    {
        "Id": "1225qzk",
        "Name": "Example-Deployment",
        "DeploymentDurationInMinutes": 15,
        "GrowthType": "LINEAR",
        "GrowthFactor": 25.0,
        "FinalBakeTimeInMinutes": 20,
        "ReplicateTo": "SSM_DOCUMENT"
    }

For more information, see `Step 4: Creating a deployment strategy  <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-deployment-strategy.html>`__ in the *AWS AppConfig User Guide*.
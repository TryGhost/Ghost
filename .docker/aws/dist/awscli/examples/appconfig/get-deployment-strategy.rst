**To retrieve details of a deployment strategy**

The following ``get-deployment-strategy`` example lists the details of the specified deployment strategy. ::

    aws appconfig get-deployment-strategy \
        --deployment-strategy-id 1225qzk

Output::

    {
        "Id": "1225qzk",
        "Name": "Example-Deployment",
        "DeploymentDurationInMinutes": 15,
        "GrowthType": "LINEAR",
        "GrowthFactor": 25.0,
        "FinalBakeTimeInMinutes": 0,
        "ReplicateTo": "SSM_DOCUMENT"
    }

For more information, see `Step 4: Creating a deployment strategy <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-deployment-strategy.html>`__ in the *AWS AppConfig User Guide*.
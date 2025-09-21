**To list the available deployment strategies**

The following ``list-deployment-strategies`` example lists the available deployment strategies in your AWS account. ::

    aws appconfig list-deployment-strategies

Output::

    {
        "Items": [
            {
                "Id": "1225qzk",
                "Name": "Example-Deployment",
                "DeploymentDurationInMinutes": 15,
                "GrowthType": "LINEAR",
                "GrowthFactor": 25.0,
                "FinalBakeTimeInMinutes": 0,
                "ReplicateTo": "SSM_DOCUMENT"
            },
            {
                "Id": "AppConfig.AllAtOnce",
                "Name": "AppConfig.AllAtOnce",
                "Description": "Quick",
                "DeploymentDurationInMinutes": 0,
                "GrowthType": "LINEAR",
                "GrowthFactor": 100.0,
                "FinalBakeTimeInMinutes": 10,
                "ReplicateTo": "NONE"
            },
            {
                "Id": "AppConfig.Linear50PercentEvery30Seconds",
                "Name": "AppConfig.Linear50PercentEvery30Seconds",
                "Description": "Test/Demo",
                "DeploymentDurationInMinutes": 1,
                "GrowthType": "LINEAR",
                "GrowthFactor": 50.0,
                "FinalBakeTimeInMinutes": 1,
                "ReplicateTo": "NONE"
            },
            {
                "Id": "AppConfig.Canary10Percent20Minutes",
                "Name": "AppConfig.Canary10Percent20Minutes",
                "Description": "AWS Recommended",
                "DeploymentDurationInMinutes": 20,
                "GrowthType": "EXPONENTIAL",
                "GrowthFactor": 10.0,
                "FinalBakeTimeInMinutes": 10,
                "ReplicateTo": "NONE"
            }
        ]
    }

For more information, see `Step 4: Creating a deployment strategy <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-deployment-strategy.html>`__ in the *AWS AppConfig User Guide*.
**To get information about deployment configurations**

The following ``list-deployment-configs`` example displays information about all deployment configurations that are associated with the user's AWS account. ::

    aws deploy list-deployment-configs

Output::

    {
        "deploymentConfigsList": [
            "ThreeQuartersHealthy",
            "CodeDeployDefault.AllAtOnce",
            "CodeDeployDefault.HalfAtATime",
            "CodeDeployDefault.OneAtATime"
        ]
    }

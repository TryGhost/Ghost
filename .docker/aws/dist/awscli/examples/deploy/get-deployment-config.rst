**To get information about a deployment configuration**

The following ``get-deployment-config`` example displays information about a deployment configuration that is associated with the user's AWS account. ::

    aws deploy get-deployment-config --deployment-config-name ThreeQuartersHealthy

Output::

    {
        "deploymentConfigInfo": {
            "deploymentConfigId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
            "minimumHealthyHosts": {
                "type": "FLEET_PERCENT",
                "value": 75
            },
            "createTime": 1411081164.379,
            "deploymentConfigName": "ThreeQuartersHealthy"
        }
    }

**To create a custom deployment configuration**

The following ``create-deployment-config`` example creates a custom deployment configuration and associates it with the user's AWS account. ::

    aws deploy create-deployment-config \
        --deployment-config-name ThreeQuartersHealthy \
        --minimum-healthy-hosts type=FLEET_PERCENT,value=75

Output::

    {
        "deploymentConfigId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE"
    }
**To clean up deployment information for a Greengrass group**

The following ``reset-deployments`` example cleans up deployment information for the specified Greengrass group. When you add the ``--force option``, the deployment information is reset without waiting for the core device to respond. ::

    aws greengrass reset-deployments \
        --group-id "1402daf9-71cf-4cfe-8be0-d5e80526d0d8" \
        --force

Output::

    {
        "DeploymentArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1402daf9-71cf-4cfe-8be0-d5e80526d0d8/deployments/7dd4e356-9882-46a3-9e28-6d21900c011a",
        "DeploymentId": "7dd4e356-9882-46a3-9e28-6d21900c011a"
    }

For more information, see `Reset Deployments <https://docs.aws.amazon.com/greengrass/latest/developerguide/reset-deployments-scenario.html>`__ in the *AWS IoT Greengrass Developer Guide*.

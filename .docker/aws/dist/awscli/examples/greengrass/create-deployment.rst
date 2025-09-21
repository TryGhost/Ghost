**To create a deployment for a version of a Greengrass group**

The following ``create-deployment`` example deploys the specified version of a Greengrass group. ::

    aws greengrass create-deployment \
        --deployment-type NewDeployment \
        --group-id "ce2e7d01-3240-4c24-b8e6-f6f6e7a9eeca" \
        --group-version-id "dc40c1e9-e8c8-4d28-a84d-a9cad5f599c9"

Output::

    {
        "DeploymentArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/ce2e7d01-3240-4c24-b8e6-f6f6e7a9eeca/deployments/bfceb608-4e97-45bc-af5c-460144270308",
        "DeploymentId": "bfceb608-4e97-45bc-af5c-460144270308"
    }

For more information, see `Getting Started with Connectors (CLI) <https://docs.aws.amazon.com/greengrass/latest/developerguide/connectors-cli.html>`__ in the *AWS IoT Greengrass Developer Guide*.

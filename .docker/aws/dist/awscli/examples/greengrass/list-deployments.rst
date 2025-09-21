**To list the deployments for a Greengrass group**

The following ``list-deployments`` example lists the deployments for the specified Greengrass group. You can use the ``list-groups`` command to look up your group ID. ::

    aws greengrass list-deployments \
        --group-id "1013db12-8b58-45ff-acc7-704248f66731"

Output::

    {
        "Deployments": [
            {
                "CreatedAt": "2019-06-18T17:04:32.702Z",
                "DeploymentId": "1065b8a0-812b-4f21-9d5d-e89b232a530f",
                "DeploymentType": "NewDeployment",
                "GroupArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/1013db12-8b58-45ff-acc7-704248f66731/versions/115136b3-cfd7-4462-b77f-8741a4b00e5e"
            }
        ]
    }

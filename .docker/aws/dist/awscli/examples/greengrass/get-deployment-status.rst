**To retrieve the status of a deployment**

The following ``get-deployment-status`` example retrieves the status for the specified deployment of the specified Greengrass group. To get the deployment ID, use the ``list-deployments`` command and specify the group ID. ::

    aws greengrass get-deployment-status \
        --group-id "1013db12-8b58-45ff-acc7-704248f66731" \
        --deployment-id "1065b8a0-812b-4f21-9d5d-e89b232a530f"
    
Output::

    {
        "DeploymentStatus": "Success",
        "DeploymentType": "NewDeployment",
        "UpdatedAt": "2019-06-18T17:04:44.761Z"
    }

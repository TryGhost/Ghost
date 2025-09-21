**To list information about individual deployments in a bulk deployment**

The following ``list-bulk-deployment-detailed-reports`` example displays information about the individual deployments in a bulk deployment operation, including status. ::

    aws greengrass list-bulk-deployment-detailed-reports \
        --bulk-deployment-id 42ce9c42-489b-4ed4-b905-8996aa50ef9d

Output::

    {
        "Deployments": [
            {
                "DeploymentType": "NewDeployment",
                "DeploymentStatus": "Success",
                "DeploymentId": "123456789012:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "DeploymentArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/a1b2c3d4-5678-90ab-cdef-EXAMPLE33333/deployments/123456789012:123456789012:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "GroupArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/a1b2c3d4-5678-90ab-cdef-EXAMPLE33333/versions/123456789012:a1b2c3d4-5678-90ab-cdef-EXAMPLE44444",
                "CreatedAt": "2020-01-21T21:34:16.501Z"
            },
            {
                "DeploymentType": "NewDeployment",
                "DeploymentStatus": "InProgress",
                "DeploymentId": "123456789012:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "DeploymentArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/a1b2c3d4-5678-90ab-cdef-EXAMPLE55555/deployments/123456789012:123456789012:a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "GroupArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/a1b2c3d4-5678-90ab-cdef-EXAMPLE55555/versions/a1b2c3d4-5678-90ab-cdef-EXAMPLE66666",
                "CreatedAt": "2020-01-21T21:34:16.486Z"
            },
            ...
        ]
    }

For more information, see `Create Bulk Deployments for Groups <https://docs.aws.amazon.com/greengrass/latest/developerguide/bulk-deploy-cli.html>`__ in the *AWS IoT Greengrass Developer Guide*.

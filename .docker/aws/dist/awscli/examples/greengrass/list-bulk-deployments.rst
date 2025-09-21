**To list bulk deployments**

The following ``list-bulk-deployments`` example lists all bulk deployments. ::

    aws greengrass list-bulk-deployments

Output::

    {
        "BulkDeployments": [
            {
                "BulkDeploymentArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/bulk/deployments/870fb41b-6288-4e0c-bc76-a7ba4b4d3267",
                "BulkDeploymentId": "870fb41b-6288-4e0c-bc76-a7ba4b4d3267",
                "CreatedAt": "2019-06-25T16:11:33.265Z"
            }
        ]
    }

For more information, see `Create Bulk Deployments for Groups <https://docs.aws.amazon.com/greengrass/latest/developerguide/bulk-deploy-cli.html>`__ in the *AWS IoT Greengrass Developer Guide*.

**To check the status of your bulk deployment**

The following ``get-bulk-deployment-status`` example retrieves status information for the specified bulk deployment operation. In this example, the file that specified the groups to be deployed has an invalid input record. ::

    aws greengrass get-bulk-deployment-status \
        --bulk-deployment-id "870fb41b-6288-4e0c-bc76-a7ba4b4d3267"

Output::

    {
        "BulkDeploymentMetrics": {
            "InvalidInputRecords": 1,
            "RecordsProcessed": 1,
            "RetryAttempts": 0
        },
        "BulkDeploymentStatus": "Completed",
        "CreatedAt": "2019-06-25T16:11:33.265Z",
        "tags": {}
    }

For more information, see `Create Bulk Deployments for Groups <https://docs.aws.amazon.com/greengrass/latest/developerguide/bulk-deploy-cli.html>`__ in the *AWS IoT Greengrass Developer Guide*.

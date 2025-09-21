**To stop a bulk deployment**

The following ``stop-bulk-deployment`` example stops the specified bulk deployment. If you try to stop a bulk deployment that is complete, you receive an error: ``InvalidInputException: Cannot change state of finished execution.`` ::

    aws greengrass stop-bulk-deployment \
        --bulk-deployment-id "870fb41b-6288-4e0c-bc76-a7ba4b4d3267"

This command produces no output.

For more information, see `Create Bulk Deployments for Groups <https://docs.aws.amazon.com/greengrass/latest/developerguide/bulk-deploy-cli.html>`__ in the *AWS IoT Greengrass Developer Guide*.

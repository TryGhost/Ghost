**To start a bulk deployment operation**

The following ``start-bulk-deployment`` example starts a bulk deployment operation, using a file stored in an S3 bucket to specify the groups to be deployed. ::

    aws greengrass start-bulk-deployment \
        --cli-input-json "{\"InputFileUri\":\"https://gg-group-deployment1.s3-us-west-2.amazonaws.com/MyBulkDeploymentInputFile.txt\", \"ExecutionRoleArn\":\"arn:aws:iam::123456789012:role/ggCreateDeploymentRole\",\"AmznClientToken\":\"yourAmazonClientToken\"}"

Output::

    {
        "BulkDeploymentArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/bulk/deployments/870fb41b-6288-4e0c-bc76-a7ba4b4d3267",
        "BulkDeploymentId": "870fb41b-6288-4e0c-bc76-a7ba4b4d3267"
    }

For more information, see `Create Bulk Deployments for Groups <https://docs.aws.amazon.com/greengrass/latest/developerguide/bulk-deploy-cli.html>`__ in the *AWS IoT Greengrass Developer Guide*.

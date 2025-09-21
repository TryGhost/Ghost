**To delete a component version**

The following ``delete-component`` example deletes a Hello World component. ::

    aws greengrassv2 delete-component \
        --arn arn:aws:greengrass:us-west-2:123456789012:components:com.example.HelloWorld:versions:1.0.0

This command produces no output.

For more information, see `Manage components <https://docs.aws.amazon.com/greengrass/v2/developerguide/manage-components.html>`__ in the *AWS IoT Greengrass V2 Developer Guide*.
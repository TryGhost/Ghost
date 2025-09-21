**To update the name for a function definition**

The following ``update-function-definition`` example updates the name for the specified function definition. If you want to update the details for the function, use the ``create-function-definition-version`` command to create a new version. ::

    aws greengrass update-function-definition \
        --function-definition-id "e47952bd-dea9-4e2c-a7e1-37bbe8807f46" \
        --name ObsoleteFunction

This command produces no output.

For more information, see `Run Local Lambda Functions <https://docs.aws.amazon.com/greengrass/latest/developerguide/lambda-functions.html>`__ in the *AWS IoT Greengrass Developer Guide*.

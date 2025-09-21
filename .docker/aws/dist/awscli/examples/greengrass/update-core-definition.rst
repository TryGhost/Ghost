**To update a core definition**

The following ``update-core-definition`` example changes the name of the specified core definition. You can update only the ``name`` property of a core definition. ::

    aws greengrass update-core-definition \
        --core-definition-id "582efe12-b05a-409e-9a24-a2ba1bcc4a12" \
        --name "MyCoreDevices"

This command produces no output.

For more information, see `Configure the AWS IoT Greengrass Core <https://docs.aws.amazon.com/greengrass/latest/developerguide/gg-core.html>`__ in the *AWS IoT Greengrass Developer Guide*.

**To update the group name**

The following ``update-group`` example updates the name of the specified Greengrass group. If you want to update the details for the group, use the ``create-group-version`` command to create a new version. ::

    aws greengrass update-group \
        --group-id "1402daf9-71cf-4cfe-8be0-d5e80526d0d8" \
        --name TestGroup4of6

For more information, see `Configure AWS IoT Greengrass on AWS IoT <https://docs.aws.amazon.com/greengrass/latest/developerguide/gg-config.html>`__ in the *AWS IoT Greengrass Developer Guide*.
**To update a device definition**

The following ``update-device-definition`` example changes the name of the specified device definition. You can only update the ``name`` property of a device definition. ::

    aws greengrass update-device-definition \
        --device-definition-id "f9ba083d-5ad4-4534-9f86-026a45df1ccd" \
        --name "TemperatureSensors"

This command produces no output.

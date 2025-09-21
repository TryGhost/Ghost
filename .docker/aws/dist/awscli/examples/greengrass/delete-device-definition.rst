**To delete a device definition**

The following ``delete-device-definition`` example deletes the specified device definition, including all of its versions. If you delete a device definition version that is used by a group version, the group version cannot be deployed successfully. ::

    aws greengrass delete-device-definition \
        --device-definition-id "f9ba083d-5ad4-4534-9f86-026a45df1ccd"

This command produces no output.

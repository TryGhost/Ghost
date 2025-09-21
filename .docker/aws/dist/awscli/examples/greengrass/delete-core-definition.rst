**To delete a core definition**

The following ``delete-core-definition`` example deletes the specified Greengrass core definition, including all versions. If you delete a core that is associated with a Greengrass group, that group can't be deployed successfully. ::

    aws greengrass delete-core-definition \
        --core-definition-id "ff36cc5f-9f98-4994-b468-9d9b6dc52abd"

This command produces no output.

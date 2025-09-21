**To delete a resource definition**

The following ``delete-resource-definition`` example deletes the specified resource definition, including all resource versions. If you delete a resource definition that is used by a group, that group can't be deployed successfully. ::

    aws greengrass delete-resource-definition \
        --resource-definition-id "ad8c101d-8109-4b0e-b97d-9cc5802ab658"

This command produces no output.

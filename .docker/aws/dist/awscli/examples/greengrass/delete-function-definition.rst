**To delete a function definition**

The following ``delete-function-definition`` example deletes the specified Greengrass function definition. If you delete a function definition that is used by a group, that group can't be deployed successfully. ::

    aws greengrass delete-function-definition \
        --function-definition-id "fd4b906a-dff3-4c1b-96eb-52ebfcfac06a"

This command produces no output.

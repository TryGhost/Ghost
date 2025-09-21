**To modify a WorkSpace creation property of a directory**

The following ``modify-workspace-creation-properties`` example enables the ``EnableInternetAccess`` property for the specified directory. This enables automatic assignment of public IP addresses for the WorkSpaces created for the directory. ::

    aws workspaces modify-workspace-creation-properties \
        --resource-id d-926722edaf \
        --workspace-creation-properties EnableInternetAccess=true

This command produces no output.

For more information, see `Update directory details for your WorkSpaces <https://docs.aws.amazon.com/workspaces/latest/adminguide/update-directory-details.html>`__ in the *Amazon WorkSpaces Administration Guide*.

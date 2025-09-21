**To delete a host**

The following ``delete-host`` example shows how to delete a host. Before you can delete a host, you must delete all connections associated with the host. ::

    aws codestar-connections delete-host \
        --host-arn "arn:aws:codestar-connections:us-east-1 :123456789012:host/My-Host-28aef605"

This command produces no output.

For more information, see `Delete a host (CLI) <https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-host-delete.html#connections-host-delete-cli>`__ in the *Developer Tools console User Guide*.
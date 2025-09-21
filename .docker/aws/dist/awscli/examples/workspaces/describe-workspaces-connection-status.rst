**To describe the connection status of a WorkSpace**

The following ``describe-workspaces-connection-status`` example describes the connection status of the specified WorkSpace. ::

    aws workspaces describe-workspaces-connection-status \
        --workspace-ids ws-dk1xzr417

Output::

    {
        "WorkspacesConnectionStatus": [
            {
                "WorkspaceId": "ws-dk1xzr417",
                "ConnectionState": "CONNECTED",
                "ConnectionStateCheckTimestamp": 1662526214.744
            }
        ]
    }

For more information, see `Administer your WorkSpaces <https://docs.aws.amazon.com/workspaces/latest/adminguide/administer-workspaces.html>`__ in the *Amazon WorkSpaces Administration Guide*.

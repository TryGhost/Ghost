**To migrate a WorkSpace**

The following ``migrate-workspace`` example migrates the specified WorkSpace to the specified bundle. ::

    aws workspaces migrate-workspace \
        --source-workspace-id ws-dk1xzr417 \
        --bundle-id wsb-j4dky1gs4

Output::

    {
        "SourceWorkspaceId": "ws-dk1xzr417",
        "TargetWorkspaceId": "ws-x5h1lbkp5"
    }

For more information, see `Migrate a WorkSpace <https://docs.aws.amazon.com/workspaces/latest/adminguide/migrate-workspaces.html>`__ in the *Amazon WorkSpaces Administration Guide*.

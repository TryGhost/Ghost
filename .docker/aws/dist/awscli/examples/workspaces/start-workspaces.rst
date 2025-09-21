**To start an AutoStop WorkSpace**

The following ``start-workspaces`` example starts the specified WorkSpace. The WorkSpace must have a running mode of ``AutoStop``. ::

    aws workspaces start-workspaces \
        --start-workspace-requests WorkspaceId=ws-dk1xzr417

Output::

    {
        "FailedRequests": []
    }

For more information, see `Stop and start an AutoStop WorkSpace <https://docs.aws.amazon.com/workspaces/latest/adminguide/running-mode.html#stop-start-workspace>`__ in the *Amazon WorkSpaces Administration Guide*.

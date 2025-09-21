**To stop an AutoStop WorkSpace**

The following ``stop-workspaces`` example stops the specified WorkSpace. The WorkSpace must have a running mode of ``AutoStop``. ::

    aws workspaces stop-workspaces \
        --stop-workspace-requests WorkspaceId=ws-dk1xzr417

Output::

    {
        "FailedRequests": []
    }

For more information, see `Stop and start an AutoStop WorkSpace <https://docs.aws.amazon.com/workspaces/latest/adminguide/running-mode.html#stop-start-workspace>`__ in the *Amazon WorkSpaces Administration Guide*.

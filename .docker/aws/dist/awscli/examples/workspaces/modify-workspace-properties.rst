**To modify the running mode of a WorkSpace**

The following ``modify-workspace-properties`` example sets the running mode of the specified WorkSpace to ``AUTO_STOP``. ::

    aws workspaces modify-workspace-properties \
        --workspace-id ws-dk1xzr417 \
        --workspace-properties RunningMode=AUTO_STOP

This command produces no output.

For more information, see `Modify a WorkSpace <https://docs.aws.amazon.com/workspaces/latest/adminguide/modify-workspaces.html>`__ in the *Amazon WorkSpaces Administration Guide*.

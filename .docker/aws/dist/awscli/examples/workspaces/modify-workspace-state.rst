**To modify the state of a WorkSpace**

The following ``modify-workspace-state`` example sets the state of the specified WorkSpace to ``ADMIN_MAINTENANCE``. ::

    aws workspaces modify-workspace-state \
        --workspace-id ws-dk1xzr417 \
        --workspace-state ADMIN_MAINTENANCE

This command produces no output.

For more information, see `WorkSpace maintenance <https://docs.aws.amazon.com/workspaces/latest/adminguide/workspace-maintenance.html>`__ in the *Amazon WorkSpaces Administration Guide*.

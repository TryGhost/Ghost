**To terminate a WorkSpace**

The following ``terminate-workspaces`` example terminates the specified workspace. ::

    aws workspaces terminate-workspaces \
        --terminate-workspace-requests ws-dk1xzr417

Output::

    {
        "FailedRequests": []
    }

For more information, see `Delete a WorkSpace <https://docs.aws.amazon.com/workspaces/latest/adminguide/delete-workspaces.html>`__ in the *Amazon WorkSpaces Administration Guide*.

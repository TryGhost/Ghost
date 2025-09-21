**To delete a tag from a WorkSpace**

The following ``delete-tags`` example deletes the specified tag from the specified WorkSpace. ::

    aws workspaces delete-tags \
        --resource-id ws-dk1xzr417 \
        --tag-keys Department

This command produces no output.

For more information, see `Tag WorkSpaces resources <https://docs.aws.amazon.com/workspaces/latest/adminguide/tag-workspaces-resources.html>`__ in the *Amazon WorkSpaces Administration Guide*.

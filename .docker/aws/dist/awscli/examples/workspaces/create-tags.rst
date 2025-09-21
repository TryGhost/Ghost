**To add tags to a WorkSpace**

The following ``create-tags`` example adds the specified tags to the specified WorkSpace. ::

    aws workspaces create-tags \
        --resource-id ws-dk1xzr417 \
        --tags Key=Department,Value=Finance

This command produces no output.

For more information, see `Tag WorkSpaces resources <https://docs.aws.amazon.com/workspaces/latest/adminguide/tag-workspaces-resources.html>`__ in the *Amazon WorkSpaces Administration Guide*.

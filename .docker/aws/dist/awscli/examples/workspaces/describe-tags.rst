**To describe the tags for a WorkSpace**

The following ``describe-tags`` example describes the tags for the specified WorkSpace. ::

    aws workspaces describe-tags \
        --resource-id ws-dk1xzr417

Output::

    {
        "TagList": [
            {
                "Key": "Department",
                "Value": "Finance"
            }
        ]
    }

For more information, see `Tag WorkSpaces resources <https://docs.aws.amazon.com/workspaces/latest/adminguide/tag-workspaces-resources.html>`__ in the *Amazon WorkSpaces Administration Guide*.

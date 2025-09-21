**To update a dynamic thing group**

The following ``update-dynamic-thing-group`` example updates the specified dynamic thing group. It provides a description and updates the query string to change the group membership criteria. ::

    aws iot update-dynamic-thing-group \
        --thing-group-name "RoomTooWarm" 
        --thing-group-properties "thingGroupDescription=\"This thing group contains rooms warmer than 65F.\"" \
        --query-string "attributes.temperature>65"

Output::

    {
        "version": 2
    }

For more information, see `Dynamic Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/dynamic-thing-groups.html>`__ in the *AWS IoT Developers Guide*.

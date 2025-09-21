**To delete a thing group**

The following ``delete-thing-group`` example deletes the specified thing group. You cannot delete a thing group if it contains child thing groups. ::

    aws iot delete-thing-group \
        --thing-group-name DefectiveBulbs

This command produces no output.

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developers Guide*.

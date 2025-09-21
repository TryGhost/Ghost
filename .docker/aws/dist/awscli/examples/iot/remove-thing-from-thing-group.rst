**To remove a thing from a thing group**

The following ``remove-thing-from-thing-group`` example removes the specified thing from a thing group. ::

    aws iot remove-thing-from-thing-group \
        --thing-name bulb7 \
        --thing-group-name DeadBulbs

This command produces no output.

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html
>`__ in the *AWS IoT Developer Guide*.

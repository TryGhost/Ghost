**To change the groups to which a thing belongs**

The following ``update-thing-groups-for-thing`` example removes the thing named ``MyLightBulb`` from the group named ``DeadBulbs`` and adds it to the group named ``replaceableItems`` at the same time. ::

    aws iot update-thing-groups-for-thing \
        --thing-name MyLightBulb \
        --thing-groups-to-add "replaceableItems" \
        --thing-groups-to-remove "DeadBulbs"

This command produces no output.

For more information, see `Thing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html>`__ in the *AWS IoT Developer Guide*.

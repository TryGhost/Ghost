**Example 1: To deprecate a thing type**

The following ``deprecate-thing-type`` example deprecates a thing type so that users can't associate any new things with it. ::

    aws iot deprecate-thing-type \
        --thing-type-name "obsoleteThingType"

This command produces no output.

**Example 2: To reverse the deprecation of a thing type**

The following ``deprecate-thing-type`` example reverses the deprecation of a thing type, which makes it possible for users to associate new things with it again. ::

    aws iot deprecate-thing-type \
        --thing-type-name "obsoleteThingType" \
        --undo-deprecate

This command produces no output.

For more information, see `Thing Types <https://docs.aws.amazon.com/iot/latest/developerguide/thing-types.html>`__ in the *AWS IoT Developers Guide*.


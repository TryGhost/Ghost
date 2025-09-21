**Example 1: To enable a topic rule destination**

The following ``update-topic-rule-destination`` example enables traffic to a topic rule destination. ::

    aws iot update-topic-rule-destination \
        --arn "arn:aws:iot:us-west-2:123456789012:ruledestination/http/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE" \
        --status ENABLED

This command produces no output.

For more information, see `Enabling a topic rule destination <https://docs.aws.amazon.com/iot/latest/developerguide/rule-destination.html#enable-destination>`__ in the *AWS IoT Developer Guide*.

**Example 2: To disable a topic rule destination**

The following ``update-topic-rule-destination`` example disables traffic to a topic rule destination. ::

    aws iot update-topic-rule-destination \
        --arn "arn:aws:iot:us-west-2:123456789012:ruledestination/http/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE" \
        --status DISABLED

This command produces no output.

For more information, see `Disabling a topic rule destination <https://docs.aws.amazon.com/iot/latest/developerguide/rule-destination.html#disable-destination>`__ in the *AWS IoT Developer Guide*.

**Example 3: To send a new confirmation message**

The following ``update-topic-rule-destination`` example sends a new confirmation message for a topic rule destination. ::

    aws iot update-topic-rule-destination \
        --arn "arn:aws:iot:us-west-2:123456789012:ruledestination/http/a1b2c3d4-5678-90ab-cdef-11111EXAMPLE" \
        --status IN_PROGRESS

This command produces no output.

For more information, see `Sending a new confirmation message <https://docs.aws.amazon.com/iot/latest/developerguide/rule-destination.html#trigger-confirm>`__ in the *AWS IoT Developer Guide*.
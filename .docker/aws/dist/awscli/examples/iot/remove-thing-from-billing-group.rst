**To remove a thing from a billing group**

The following ``remove-thing-from-billing-group`` example removes the specified thing from a billing group. ::

    aws iot remove-thing-from-billing-group \
        --billing-group-name GroupOne \
        --thing-name MyOtherLightBulb

This command produces no output.

For more information, see `Billing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/tagging-iot-billing-groups.html>`__ in the *AWS IoT Developers Guide*.


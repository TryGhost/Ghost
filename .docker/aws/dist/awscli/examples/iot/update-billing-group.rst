**To update information about a billing group**

The following ``update-billing-group`` example updates the description for the specified billing group. ::

    aws iot update-billing-group \
        --billing-group-name GroupOne \
        --billing-group-properties "billingGroupDescription=\"Primary bulb billing group\""

Output::

    {
        "version": 2
    }

For more information, see `Billing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/tagging-iot-billing-groups.html>`__ in the *AWS IoT Developers Guide*.

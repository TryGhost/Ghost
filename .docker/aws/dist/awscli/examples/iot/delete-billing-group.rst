**To delete a billing group**

The following ``delete-billing-group`` example deletes the specified billing group. You can delete a billing group even if it contains one or more things. ::

    aws iot delete-billing-group \
        --billing-group-name BillingGroupTwo

This command does not produce any output.

For more information, see `Billing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/tagging-iot-billing-groups.html>`__ in the *AWS IoT Developers Guide*.


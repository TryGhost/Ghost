**Example 1: To add a thing by name to a billing group**

The following ``add-thing-to-billing-group`` example adds the thing named ``MyLightBulb`` to the billing group named ``GroupOne``. ::

    aws iot add-thing-to-billing-group \
        --billing-group-name GroupOne \
        --thing-name MyLightBulb

This command produces no output.

**Example 2: To add a thing by ARN to a billing group**

The following ``add-thing-to-billing-group`` example adds a thing with a specified ARN to a billing group with the specified ARN. Specifying an ARN is helpful if you work with multiple AWS Regions or accounts. It can help ensure that you are adding to the right Region and account. ::

    aws iot add-thing-to-thing-group \
        --billing-group-arn "arn:aws:iot:us-west-2:123456789012:billinggroup/GroupOne" \
        --thing-arn "arn:aws:iot:us-west-2:123456789012:thing/MyOtherLightBulb"

This command produces no output.

For more information, see `Billing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/tagging-iot-billing-groups.html>`__ in the *AWS IoT Developers Guide*.

**To get information about a billing group**

The following ``describe-billing-group`` example gets information for the specified billing group. ::

    aws iot describe-billing-group --billing-group-name GroupOne

Output::

    {
        "billingGroupName": "GroupOne",
        "billingGroupId": "103de383-114b-4f51-8266-18f209ef5562",
        "billingGroupArn": "arn:aws:iot:us-west-2:123456789012:billinggroup/GroupOne",
        "version": 1,
        "billingGroupProperties": {},
        "billingGroupMetadata": {
            "creationDate": 1560199355.378
        }
    }

For more information, see `Billing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/tagging-iot-billing-groups.html>`__ in the *AWS IoT Developers Guide*.

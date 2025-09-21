**To list the things in a billing group**

The following ``list-things-in-billing-group`` example lists the things that are in the specified billing group. ::

    aws iot list-things-in-billing-group \
        --billing-group-name GroupOne

Output::

    {
        "things": [
            "MyOtherLightBulb",
            "MyLightBulb"
        ]
    }

For more information, see `Billing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/tagging-iot-billing-groups.html>`__ in the *AWS IoT Developers Guide*.

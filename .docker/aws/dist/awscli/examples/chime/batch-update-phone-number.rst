**To update several phone number product types at the same time**

The following ``batch-update-phone-number`` example updates the product types for all of the specified phone numbers. ::

    aws chime batch-update-phone-number \
        --update-phone-number-request-items PhoneNumberId=%2B12065550100,ProductType=BusinessCalling PhoneNumberId=%2B12065550101,ProductType=BusinessCalling

Output::

    {
        "PhoneNumberErrors": []
    }

**To update several phone number calling names at the same time**

The following ``batch-update-phone-number`` example updates the calling names for all of the specified phone numbers. ::

    aws chime batch-update-phone-number \
        --update-phone-number-request-items PhoneNumberId=%2B14013143874,CallingName=phonenumber1 PhoneNumberId=%2B14013144061,CallingName=phonenumber2

Output::

    {
        "PhoneNumberErrors": []
    }

For more information, see `Working with Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/phone-numbers.html>`__ in the *Amazon Chime Administration Guide*.


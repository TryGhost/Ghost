**To delete multiple phone numbers**

The following ``batch-delete-phone-number`` example deletes all of the specified phone numbers. ::

    aws chime batch-delete-phone-number \
        --phone-number-ids "%2B12065550100" "%2B12065550101"

This command produces no output.
Output::

    {
        "PhoneNumberErrors": []
    }

For more information, see `Working with Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/phone-numbers.html>`__ in the *Amazon Chime Administration Guide*.

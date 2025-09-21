**To search available phone numbers**

The following ``search-available-phone-numbers`` example searches available phone numbers by area code. ::

    aws chime search-available-phone-numbers \
        --area-code "206"

Output::

    {
        "E164PhoneNumbers": [
            "+12065550100",
            "+12065550101",
            "+12065550102",
            "+12065550103",
            "+12065550104",
            "+12065550105",
            "+12065550106",
            "+12065550107",
            "+12065550108",
            "+12065550109",
        ]
    }

For more information, see `Working with Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/phone-numbers.html>`__ in the *Amazon Chime Administration Guide*.

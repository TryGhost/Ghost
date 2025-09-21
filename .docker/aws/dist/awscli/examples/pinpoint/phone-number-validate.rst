**Retrieves information about a phone number**

The following ``phone-number-validate`` retrieves information about a phone number. ::

    aws pinpoint phone-number-validate \
        --number-validate-request PhoneNumber="+12065550142" \
        --region us-east-1 

Output::

    {
        "NumberValidateResponse": {
            "Carrier": "ExampleCorp Mobile",
            "City": "Seattle",
            "CleansedPhoneNumberE164": "+12065550142",
            "CleansedPhoneNumberNational": "2065550142",
            "Country": "United States",
            "CountryCodeIso2": "US",
            "CountryCodeNumeric": "1",
            "OriginalPhoneNumber": "+12065550142",
            "PhoneType": "MOBILE",
            "PhoneTypeCode": 0,
            "Timezone": "America/Los_Angeles",
            "ZipCode": "98101"
        }
    }

For more information, see `Amazon Pinpoint SMS channel <https://docs.aws.amazon.com/pinpoint/latest/userguide/channels-sms.html>`__ in the *Amazon Pinpoint User Guide*.
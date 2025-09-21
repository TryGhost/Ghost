**To restore a phone number**

The following ``restore-phone-number`` example restores the specified phone number from the deletion queue. ::

    aws chime restore-phone-number \
        --phone-number-id "+12065550100"

Output::

    {
        "PhoneNumber": {
            "PhoneNumberId": "%2B12065550100",
            "E164PhoneNumber": "+12065550100",
            "Type": "Local",
            "ProductType": "BusinessCalling",
            "Status": "Unassigned",
            "Capabilities": {
                "InboundCall": true,
                "OutboundCall": true,
                "InboundSMS": true,
                "OutboundSMS": true,
                "InboundMMS": true,
                "OutboundMMS": true
            },
            "Associations": [],
            "CreatedTimestamp": "2019-08-09T21:35:21.445Z",
            "UpdatedTimestamp": "2019-08-12T22:06:36.355Z"
        }
    }

For more information, see `Working with Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/phone-numbers.html>`__ in the *Amazon Chime Administration Guide*.

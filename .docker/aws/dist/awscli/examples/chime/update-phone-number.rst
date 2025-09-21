**Example 1: To update the product type for a phone number**

The following ``update-phone-number`` example updates the specified phone number's product type. ::

    aws chime update-phone-number \
        --phone-number-id "+12065550100" \
        --product-type "BusinessCalling"

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
            "CallingName": "phonenumber1",
            "CreatedTimestamp": "2019-08-09T21:35:21.445Z",
            "UpdatedTimestamp": "2019-08-12T21:44:07.591Z"
        }
    }

**Example 2: To update the outbound calling name for a phone number**

The following ``update-phone-number`` example updates the outbound calling name for the specified phone number.

    aws chime update-phone-number \
        --phone-number-id "+12065550100" \
        --calling-name "phonenumber2"

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
            "CallingName": "phonenumber2",
            "CreatedTimestamp": "2019-08-09T21:35:21.445Z",
            "UpdatedTimestamp": "2019-08-12T21:44:07.591Z"
        }
    }

For more information, see `Working with Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/phone-numbers.html>`__ in the *Amazon Chime Administration Guide*.

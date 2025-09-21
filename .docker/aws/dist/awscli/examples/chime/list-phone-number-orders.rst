**To list phone number orders**

The following ``list-phone-number-orders`` example lists the phone number orders associated with the Amazon Chime administrator's account. ::

    aws chime list-phone-number-orders

Output::

    {
        "PhoneNumberOrders": [
            {
                "PhoneNumberOrderId": "abc12345-de67-89f0-123g-h45i678j9012",
                "ProductType": "VoiceConnector",
                "Status": "Partial",
                "OrderedPhoneNumbers": [
                    {
                        "E164PhoneNumber": "+12065550100",
                        "Status": "Acquired"
                    },
                    {
                        "E164PhoneNumber": "+12065550101",
                        "Status": "Acquired"
                    },
                    {
                        "E164PhoneNumber": "+12065550102",
                        "Status": "Failed"
                    }
                ],
                "CreatedTimestamp": "2019-08-09T21:35:21.427Z",
                "UpdatedTimestamp": "2019-08-09T21:35:31.926Z"
            }
            {
                "PhoneNumberOrderId": "cba54321-ed76-09f5-321g-h54i876j2109",
                "ProductType": "BusinessCalling",
                "Status": "Partial",
                "OrderedPhoneNumbers": [
                    {
                        "E164PhoneNumber": "+12065550103",
                        "Status": "Acquired"
                    },
                    {
                        "E164PhoneNumber": "+12065550104",
                        "Status": "Acquired"
                    },
                    {
                        "E164PhoneNumber": "+12065550105",
                        "Status": "Failed"
                    }
                ],
                "CreatedTimestamp": "2019-08-09T21:35:21.427Z",
                "UpdatedTimestamp": "2019-08-09T21:35:31.926Z"
            }
        ]
    }

For more information, see `Working with Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/phone-numbers.html>`__ in the *Amazon Chime Administration Guide*.

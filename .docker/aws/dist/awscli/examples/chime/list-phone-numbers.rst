**To list phone numbers for an Amazon Chime account**

The following ``list-phone-numbers`` example lists the phone numbers associated with the administrator's Amazon Chime account. ::

    aws chime list-phone-numbers

This command produces no output.
Output::

    {
        "PhoneNumbers": [
            {
                "PhoneNumberId": "%2B12065550100",
                "E164PhoneNumber": "+12065550100",
                "Type": "Local",
                "ProductType": "VoiceConnector",
                "Status": "Assigned",
                "Capabilities": {
                    "InboundCall": true,
                    "OutboundCall": true,
                    "InboundSMS": true,
                    "OutboundSMS": true,
                    "InboundMMS": true,
                    "OutboundMMS": true
                },
                "Associations": [
                    {
                        "Value": "abcdef1ghij2klmno3pqr4",
                        "Name": "VoiceConnectorId",
                        "AssociatedTimestamp": "2019-10-28T18:40:37.453Z"
                    }
                ],
                "CallingNameStatus": "UpdateInProgress",
                "CreatedTimestamp": "2019-08-12T22:10:20.521Z",
                "UpdatedTimestamp": "2019-10-28T18:42:07.964Z"
            },
            {
                "PhoneNumberId": "%2B12065550101",
                "E164PhoneNumber": "+12065550101",
                "Type": "Local",
                "ProductType": "VoiceConnector",
                "Status": "Assigned",
                "Capabilities": {
                    "InboundCall": true,
                    "OutboundCall": true,
                    "InboundSMS": true,
                    "OutboundSMS": true,
                    "InboundMMS": true,
                    "OutboundMMS": true
                },
                "Associations": [
                    {
                        "Value": "abcdef1ghij2klmno3pqr4",
                        "Name": "VoiceConnectorId",
                        "AssociatedTimestamp": "2019-10-28T18:40:37.511Z"
                    }
                ],
                "CallingNameStatus": "UpdateInProgress",
                "CreatedTimestamp": "2019-08-12T22:10:20.521Z",
                "UpdatedTimestamp": "2019-10-28T18:42:07.960Z"
            }
        ]
    }

For more information, see `Working with Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/phone-numbers.html>`__ in the *Amazon Chime Administration Guide*.

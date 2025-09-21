**To create a phone number order**

The following ``create-phone-number-order`` example  creates a phone number order for the specified phone numbers. ::

    aws chime create-phone-number-order \
        --product-type VoiceConnector \ 
        --e164-phone-numbers "+12065550100" "+12065550101" "+12065550102"

Output::

    {
        "PhoneNumberOrder": {
            "PhoneNumberOrderId": "abc12345-de67-89f0-123g-h45i678j9012",
            "ProductType": "VoiceConnector",
            "Status": "Processing",
            "OrderedPhoneNumbers": [
                {
                    "E164PhoneNumber": "+12065550100",
                    "Status": "Processing"
                },
                {
                   "E164PhoneNumber": "+12065550101",
                   "Status": "Processing"
                },
                {
                  "E164PhoneNumber": "+12065550102",
                  "Status": "Processing"
                }
            ],
            "CreatedTimestamp": "2019-08-09T21:35:21.427Z",
            "UpdatedTimestamp": "2019-08-09T21:35:22.408Z"
        }
    }

For more information, see `Working with Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/phone-numbers.html>`__ in the *Amazon Chime Administration Guide*.

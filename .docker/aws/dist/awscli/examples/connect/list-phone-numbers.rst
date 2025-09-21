**To list the phone numbers in an instance**

The following ``list-phone-numbers`` example lists the phone numbers in the specified Amazon Connect instance. ::

    aws connect list-phone-numbers \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 
        
Output::
   
    {
        "PhoneNumberSummaryList": [
            {
                "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/phone-number/xyz80zxy-xyz1-80zx-zx80-11111EXAMPLE",
                "PhoneNumber": "+17065551212",
                "PhoneNumberType": "DID",
                "PhoneNumberCountryCode": "US"
            },
            {
                "Id": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/phone-number/ccc0ccc-xyz1-80zx-zx80-22222EXAMPLE",
                "PhoneNumber": "+18555551212",
                "PhoneNumberType": "TOLL_FREE",
                "PhoneNumberCountryCode": "US"
            }
        ]
    }
    
For more information, see `Set Up Phone Numbers for Your Contact Center <https://docs.aws.amazon.com/connect/latest/adminguide/contact-center-phone-number.html>`__ in the *Amazon Connect Administrator Guide*.


**To list the contact flows in an instance**

The following ``list-contact-flows`` example lists the contact flows in the specified Amazon Connect instance. ::

    aws connect list-contact-flows \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 

Output::

   {
        "ContactFlowSummaryList": [
            {
                "Id": "12345678-1111-2222-800e-a2b3c4d5f6g7",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/contact-flow/12345678-1111-2222-800e-a2b3c4d5f6g7",
                "Name": "Default queue transfer",
                "ContactFlowType": "QUEUE_TRANSFER"
            },
            {
                "Id": "87654321-2222-3333-ac99-123456789102",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/contact-flow/87654321-2222-3333-ac99-123456789102",
                "Name": "Default agent hold",
                "ContactFlowType": "AGENT_HOLD"
            },
            {
                "Id": "abcdefgh-3333-4444-8af3-201123456789",
                    "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/contact-flow/abcdefgh-3333-4444-8af3-201123456789",
                "Name": "Default customer hold",
                "ContactFlowType": "CUSTOMER_HOLD"
            },
        ]
    }

For more information, see `Create Amazon Connect Contact Flows <https://docs.aws.amazon.com/connect/latest/adminguide/connect-contact-flows.html>`__ in the *Amazon Connect Administrator Guide*.

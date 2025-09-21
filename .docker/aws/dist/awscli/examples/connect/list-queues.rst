**To list the queues in an instance**

The following ``list-queues`` example lists the queues in the specified Amazon Connect instance. ::

    aws connect list-queues \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 

Output::

    {
        "QueueSummaryList": [
            {
                "Id": "12345678-1111-2222-800e-a2b3c4d5f6g7",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/queue/agent/12345678-1111-2222-800e-a2b3c4d5f6g7",
                "QueueType": "AGENT"
            },
            {
                "Id": "87654321-2222-3333-ac99-123456789102",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/queue/agent/87654321-2222-3333-ac99-123456789102",
                "QueueType": "AGENT"
            },
            {
                "Id": "abcdefgh-3333-4444-8af3-201123456789",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/queue/agent/abcdefgh-3333-4444-8af3-201123456789",
                "QueueType": "AGENT"
            },
            {
                "Id": "hgfedcba-4444-5555-a31f-123456789102",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111/queue/hgfedcba-4444-5555-a31f-123456789102",
                "Name": "BasicQueue",
                "QueueType": "STANDARD"
            },
        ]
    }

For more information, see `Create a Queue <https://docs.aws.amazon.com/connect/latest/adminguide/create-queue.html>`__ in the *Amazon Connect Administrator Guide*.

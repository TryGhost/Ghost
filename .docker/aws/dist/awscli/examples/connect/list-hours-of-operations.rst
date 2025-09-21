**To list the hours of operation in an instance**

The following ``list-hours-of-operations`` example lists the hours of operations for the specified Amazon Connect instance. ::

    aws connect list-hours-of-operations \
        --instance-id 40c83b68-ea62-414c-97bb-d018e39e158e 

Output::

    {
        "HoursOfOperationSummaryList": [
            {
                "Id": "d69f1f84-7457-4924-8fbe-e64875546259",
                "Arn": "arn:aws:connect:us-west-2:123456789012:instance/40c83b68-ea62-414c-97bb-d018e39e158e/operating-hours/d69f1f84-7457-4924-8fbe-e64875546259",
                "Name": "Basic Hours"
            }
        ]
    }

For more information, see `Set the Hours of Operation for a Queue <https://docs.aws.amazon.com/connect/latest/adminguide/set-hours-operation.html>`__ in the *Amazon Connect Administrator Guide*.

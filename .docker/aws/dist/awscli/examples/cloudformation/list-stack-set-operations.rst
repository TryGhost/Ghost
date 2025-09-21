**To list stack set operations**

The following ``list-stack-set-operations`` example displays the list of the most recent operations on the specified stack set. ::

    aws cloudformation list-stack-set-operations \
        --stack-set-name my-stack-set

Output::

    {
        "Summaries": [
            {
                "OperationId": "35d45ebc-ed88-xmpl-ab59-0197a1fc83a0",
                "Action": "UPDATE",
                "Status": "SUCCEEDED",
                "CreationTimestamp": "2019-10-03T16:28:44.377Z",
                "EndTimestamp": "2019-10-03T16:42:08.607Z"
            },
            {
                "OperationId": "891aa98f-7118-xmpl-00b2-00954d1dd0d6",
                "Action": "UPDATE",
                "Status": "FAILED",
                "CreationTimestamp": "2019-10-03T15:43:53.916Z",
                "EndTimestamp": "2019-10-03T15:45:58.925Z"
            }
        ]
    }

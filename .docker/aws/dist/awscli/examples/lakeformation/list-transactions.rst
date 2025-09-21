**To list all transactions details**

The following ``list-transactions`` example returns metadata about transactions and their status. ::

    aws lakeformation list-transactions \
        --cli-input-json file://input.json

Contents of ``input.json``::

    {
        "CatalogId": "123456789111",
        "StatusFilter": "ALL",
        "MaxResults": 3
    }

Output::

    {
        "Transactions": [{
                "TransactionId": "1234569f08804cb790d950d4d0fe485e",
                "TransactionStatus": "committed",
                "TransactionStartTime": "2022-08-10T14:32:29.220000+00:00",
                "TransactionEndTime": "2022-08-10T14:32:33.751000+00:00"
            },
            {
                "TransactionId": "12345972ca8347b89825e33c5774aec4",
                "TransactionStatus": "committed",
                "TransactionStartTime": "2022-08-10T14:29:04.046000+00:00",
                "TransactionEndTime": "2022-08-10T14:29:09.681000+00:00"
            },
            {
                "TransactionId": "12345daf6cb047dbba8ad9b0414613b2",
                "TransactionStatus": "committed",
                "TransactionStartTime": "2022-08-10T13:56:51.261000+00:00",
                "TransactionEndTime": "2022-08-10T13:56:51.547000+00:00"
            }
        ],
        "NextToken": "77X1ebypsI7os+X2lhHsZLGNCDK3nNGpwRdFpicSOHgcX1/QMoniUAKcpR3kj3ts3PVdMA=="
    }

For more information, see `Reading from and writing to the data lake within transactions <https://docs.aws.amazon.com/lake-formation/latest/dg/transaction-ops.html>`__ in the *AWS Lake Formation Developer Guide*.

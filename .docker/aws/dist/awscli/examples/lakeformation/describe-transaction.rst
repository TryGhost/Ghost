**To retrieve a transaction details**

The following ``describe-transaction`` example returns the details of a single transaction. ::

    aws lakeformation describe-transaction \
        --transaction-id='8cb4b1a7cc8d486fbaca9a64e7d9f5ce'

Output::

    {
        "TransactionDescription": {
            "TransactionId": "12345972ca8347b89825e33c5774aec4",
            "TransactionStatus": "committed",
            "TransactionStartTime": "2022-08-10T14:29:04.046000+00:00",
            "TransactionEndTime": "2022-08-10T14:29:09.681000+00:00"
        }
    }

For more information, see `Reading from and writing to the data lake within transactions <https://docs.aws.amazon.com/lake-formation/latest/dg/transaction-ops.html>`__ in the *AWS Lake Formation Developer Guide*.

**To start new transaction**

The following ``start-transaction`` example starts a new transaction and returns its transaction ID. ::

    aws lakeformation start-transaction \
        --transaction-type = 'READ_AND_WRITE'

Output::

    {
        "TransactionId": "b014d972ca8347b89825e33c5774aec4"
    }

For more information, see `Reading from and writing to the data lake within transactions <https://docs.aws.amazon.com/lake-formation/latest/dg/transaction-ops.html>`__ in the *AWS Lake Formation Developer Guide*.

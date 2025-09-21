**To commit transaction**

The following ``commit-transaction`` example commits the transaction. ::

    aws lakeformation commit-transaction \
        --transaction-id='b014d972ca8347b89825e33c5774aec4'

Output::

    {
        "TransactionStatus": "committed"
    }

For more information, see `Reading from and writing to the data lake within transactions <https://docs.aws.amazon.com/lake-formation/latest/dg/transaction-ops.html>`__ in the *AWS Lake Formation Developer Guide*.

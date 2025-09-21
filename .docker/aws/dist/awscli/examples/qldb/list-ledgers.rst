**To list your available ledgers**

The following ``list-ledgers`` example lists all ledgers that are associated with the current AWS account and Region. ::

    aws qldb list-ledgers

Output::

    {
        "Ledgers": [
            {
                "State": "ACTIVE",
                "CreationDateTime": 1568839243.951,
                "Name": "myExampleLedger"
            },
            {
                "State": "ACTIVE",
                "CreationDateTime": 1568839543.557,
                "Name": "myExampleLedger2"
            }
        ]
    }

For more information, see `Basic Operations for Amazon QLDB Ledgers <https://docs.aws.amazon.com/qldb/latest/developerguide/ledger-management.basics.html>`__ in the *Amazon QLDB Developer Guide*.

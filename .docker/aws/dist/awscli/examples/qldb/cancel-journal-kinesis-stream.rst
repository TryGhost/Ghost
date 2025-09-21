**To cancel a journal stream**

The following ``cancel-journal-kinesis-stream`` example cancels the specified journal stream from a ledger. ::

    aws qldb cancel-journal-kinesis-stream \
        --ledger-name myExampleLedger \
        --stream-id 7ISCkqwe4y25YyHLzYUFAf

Output::

    {
        "StreamId": "7ISCkqwe4y25YyHLzYUFAf"
    }

For more information, see `Streaming journal data from Amazon QLDB <https://docs.aws.amazon.com/qldb/latest/developerguide/streams.html>`__ in the *Amazon QLDB Developer Guide*.

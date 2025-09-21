**To write multiple records to a stream**

The following ``put-record-batch`` example writes three records to a stream. The data is encoded in Base64 format. ::

    aws firehose put-record-batch \
        --delivery-stream-name my-stream \
        --records file://records.json

Contents of ``myfile.json``::

    [
        {"Data": "Rmlyc3QgdGhpbmc="},
        {"Data": "U2Vjb25kIHRoaW5n"},
        {"Data": "VGhpcmQgdGhpbmc="}
    ]

Output::

    {
        "FailedPutCount": 0,
        "Encrypted": false,
        "RequestResponses": [
            {
                "RecordId": "9D2OJ6t2EqCTZTXwGzeSv/EVHxRoRCw89xd+o3+sXg8DhYOaWKPSmZy/CGlRVEys1u1xbeKh6VofEYKkoeiDrcjrxhQp9iF7sUW7pujiMEQ5LzlrzCkGosxQn+3boDnURDEaD42V7GiixpOyLJkYZcae1i7HzlCEoy9LJhMr8EjDSi4Om/9Vc2uhwwuAtGE0XKpxJ2WD7ZRWtAnYlKAnvgSPRgg7zOWL"
            },
            {
                "RecordId": "jFirejqxCLlK5xjH/UNmlMVcjktEN76I7916X9PaZ+PVaOSXDfU1WGOqEZhxq2js7xcZ552eoeDxsuTU1MSq9nZTbVfb6cQTIXnm/GsuF37Uhg67GKmR5z90l6XKJ+/+pDloFv7Hh9a3oUS6wYm3DcNRLTHHAimANp1PhkQvWpvLRfzbuCUkBphR2QVzhP9OiHLbzGwy8/DfH8sqWEUYASNJKS8GXP5s"
            },
            {
                "RecordId": "oy0amQ40o5Y2YV4vxzufdcMOOw6n3EPr3tpPJGoYVNKH4APPVqNcbUgefo1stEFRg4hTLrf2k6eliHu/9+YJ5R3iiedHkdsfkIqX0XTySSutvgFYTjNY1TSrK0pM2sWxpjqqnk3+2UX1MV5z88xGro3cQm/DTBt3qBlmTj7Xq8SKVbO1S7YvMTpWkMKA86f8JfmT8BMKoMb4XZS/sOkQLe+qh0sYKXWl"
            }
        ]
    }

For more information, see `Sending Data to an Amazon Kinesis Data Firehose Delivery Stream <https://docs.aws.amazon.com/firehose/latest/dev/basic-write.html>`__ in the *Amazon Kinesis Data Firehose Developer Guide*.

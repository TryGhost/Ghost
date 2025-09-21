**To obtain records from a shard**

The following ``get-records`` example gets data records from a Kinesis data stream's shard using the specified shard iterator. ::

    aws kinesis get-records \
        --shard-iterator AAAAAAAAAAF7/0mWD7IuHj1yGv/TKuNgx2ukD5xipCY4cy4gU96orWwZwcSXh3K9tAmGYeOZyLZrvzzeOFVf9iN99hUPw/w/b0YWYeehfNvnf1DYt5XpDJghLKr3DzgznkTmMymDP3R+3wRKeuEw6/kdxY2yKJH0veaiekaVc4N2VwK/GvaGP2Hh9Fg7N++q0Adg6fIDQPt4p8RpavDbk+A4sL9SWGE1

Output::

    {
        "Records": [],
        "MillisBehindLatest": 80742000
    }

For more information, see `Developing Consumers Using the Kinesis Data Streams API with the AWS SDK for Java <https://docs.aws.amazon.com/streams/latest/dev/developing-consumers-with-sdk.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.

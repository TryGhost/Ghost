**To write a record to a stream**

The following ``put-record`` example writes data to a stream.  The data is encoded in Base64 format. ::

    aws firehose put-record \
        --delivery-stream-name my-stream \
        --record '{"Data":"SGVsbG8gd29ybGQ="}' 

Output::

    {
        "RecordId": "RjB5K/nnoGFHqwTsZlNd/TTqvjE8V5dsyXZTQn2JXrdpMTOwssyEb6nfC8fwf1whhwnItt4mvrn+gsqeK5jB7QjuLg283+Ps4Sz/j1Xujv31iDhnPdaLw4BOyM9Amv7PcCuB2079RuM0NhoakbyUymlwY8yt20G8X2420wu1jlFafhci4erAt7QhDEvpwuK8N1uOQ1EuaKZWxQHDzcG6tk1E49IPeD9k",
        "Encrypted": false
    }


For more information, see `Sending Data to an Amazon Kinesis Data Firehose Delivery Stream <https://docs.aws.amazon.com/firehose/latest/dev/basic-write.html>`__ in the *Amazon Kinesis Data Firehose Developer Guide*.

**To describe a data stream consumer**

The following ``describe-stream-consumer`` example returns the description of the specified consumer, registered with the specified data stream. ::

    aws kinesis describe-stream-consumer \
        --stream-arn arn:aws:kinesis:us-west-2:012345678912:stream/samplestream \
        --consumer-name KinesisConsumerApplication

Output::

    {
        "ConsumerDescription": {
            "ConsumerName": "KinesisConsumerApplication",
            "ConsumerARN": "arn:aws:kinesis:us-west-2:123456789012:stream/samplestream/consumer/KinesisConsumerApplication:1572383852",
            "ConsumerStatus": "ACTIVE",
            "ConsumerCreationTimestamp": 1572383852.0,
            "StreamARN": "arn:aws:kinesis:us-west-2:123456789012:stream/samplestream"
        }
    }

For more information, see `Reading Data from Amazon Kinesis Data Streams <https://docs.aws.amazon.com/streams/latest/dev/building-consumers.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.

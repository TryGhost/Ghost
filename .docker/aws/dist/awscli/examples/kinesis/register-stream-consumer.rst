**To register a data stream consumer**

The following ``register-stream-consumer`` example registers a consumer called ``KinesisConsumerApplication`` with the specified data stream. ::

    aws kinesis register-stream-consumer \
        --stream-arn arn:aws:kinesis:us-west-2:012345678912:stream/samplestream \
        --consumer-name KinesisConsumerApplication

Output::

    {
        "Consumer": {
            "ConsumerName": "KinesisConsumerApplication",
            "ConsumerARN": "arn:aws:kinesis:us-west-2: 123456789012:stream/samplestream/consumer/KinesisConsumerApplication:1572383852",
            "ConsumerStatus": "CREATING",
            "ConsumerCreationTimestamp": 1572383852.0
        }
    }

For more information, see `Developing Consumers with Enhanced Fan-Out Using the Kinesis Data Streams API <https://docs.aws.amazon.com/streams/latest/dev/building-enhanced-consumers-api.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.

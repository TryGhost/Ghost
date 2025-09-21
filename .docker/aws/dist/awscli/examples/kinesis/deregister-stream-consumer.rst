**To deregister a data stream consumer**

The following ``deregister-stream-consumer`` example deregisters the specified consumer from the specified data stream. ::

    aws kinesis deregister-stream-consumer \
        --stream-arn arn:aws:kinesis:us-west-2:123456789012:stream/samplestream \
        --consumer-name KinesisConsumerApplication

This command produces no output.

For more information, see `Developing Consumers with Enhanced Fan-Out Using the Kinesis Data Streams API <https://docs.aws.amazon.com/streams/latest/dev/building-enhanced-consumers-api.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.

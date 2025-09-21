**To remove tags from a data stream**

The following ``remove-tags-from-stream`` example removes the tag with the specified key from the specified data stream. ::

    aws kinesis remove-tags-from-stream \
        --stream-name samplestream \
        --tag-keys samplekey

This command produces no output.

For more information, see `Tagging Your Streams <https://docs.aws.amazon.com/streams/latest/dev/tagging.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.

**To add tags to a data stream**

The following ``add-tags-to-stream`` example assigns a tag with the key ``samplekey`` and value ``example`` to the specified stream. ::

    aws kinesis add-tags-to-stream \
        --stream-name samplestream \
        --tags samplekey=example

This command produces no output.

For more information, see `Tagging Your Streams <https://docs.aws.amazon.com/streams/latest/dev/tagging.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.

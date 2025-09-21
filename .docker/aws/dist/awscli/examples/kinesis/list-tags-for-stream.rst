**To list tags for a data stream**

The following ``list-tags-for-stream`` example lists the tags attached to the specified data stream. ::

    aws kinesis list-tags-for-stream \
        --stream-name samplestream

Output::

    {
        "Tags": [
            {
                "Key": "samplekey",
                "Value": "example"
            }
        ],
        "HasMoreTags": false
    }

For more information, see `Tagging Your Streams <https://docs.aws.amazon.com/streams/latest/dev/tagging.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.

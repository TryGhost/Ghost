**To list the available delivery streams**

The following ``list-delivery-streams`` example lists the available delivery streams in your AWS account. ::

    aws firehose list-delivery-streams

Output::

    {
        "DeliveryStreamNames": [
            "my-stream"
        ],
        "HasMoreDeliveryStreams": false
    }

For more information, see `Creating an Amazon Kinesis Data Firehose Delivery Stream <https://docs.aws.amazon.com/firehose/latest/dev/basic-create.html>`__ in the *Amazon Kinesis Data Firehose Developer Guide*.

**To decrease data stream retention period**

The following ``decrease-stream-retention-period`` example decreases the retention period (the length of time data records are accessible after they are added to the stream) of a stream named samplestream to 48 hours. ::

    aws kinesis decrease-stream-retention-period \
        --stream-name samplestream \
        --retention-period-hours 48 

This command produces no output.

For more information, see `Changing the Data Retention Period <https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.

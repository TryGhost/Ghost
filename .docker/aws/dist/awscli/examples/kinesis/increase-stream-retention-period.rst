**To increase data stream retention period**

The following ``increase-stream-retention-period`` example increases the retention period (the length of time data records are accessible after they are added to the stream) of the specified stream to 168 hours. ::

    aws kinesis increase-stream-retention-period \
        --stream-name samplestream \
        --retention-period-hours 168

This command produces no output.

For more information, see `Changing the Data Retention Period <https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.

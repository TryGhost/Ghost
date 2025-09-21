**To enable data stream encryption**

The following ``start-stream-encryption`` example enables server-side encryption for the specified stream, using the specified AWS KMS key. ::

    aws kinesis start-stream-encryption \
        --encryption-type KMS \
        --key-id arn:aws:kms:us-west-2:012345678912:key/a3c4a7cd-728b-45dd-b334-4d3eb496e452 \
        --stream-name samplestream

This command produces no output.

For more information, see `Data Protection in Amazon Kinesis Data Streams <https://docs.aws.amazon.com/streams/latest/dev/server-side-encryption.html>`__ in the *Amazon Kinesis Data Streams Developer Guide*.

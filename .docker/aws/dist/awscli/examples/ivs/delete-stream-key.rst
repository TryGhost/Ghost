**To delete a stream key**

The following ``delete-stream-key`` example deletes the stream key for a specified ARN (Amazon Resource Name), so it can no longer be used to stream. ::

    aws ivs delete-stream-key \
        --arn arn:aws:ivs:us-west-2:123456789012:stream-key/g1H2I3j4k5L6

This command produces no output.

For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.
**To insert metadata into the active stream for a specified channel**

The following ``put-metadata`` example inserts the given metadata into the stream for the specified channel. ::

    aws ivs put-metadata \
        --channel-arn arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh \
        --metadata '{"my": "metadata"}'

This command produces no output.

For more information, see `Create a Channel <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/getting-started-create-channel.html>`__ in the *IVS Low-Latency User Guide*.
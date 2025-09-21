**Example 1: To delete an inactive ingest configuration**

The following ``delete-ingest-configuration`` example deletes the inactive ingest configuration for a specified ingest-configuration ARN (Amazon Resource Name). ::

    aws ivs-realtime delete-ingest-configuration \
        --arn arn:aws:ivs:us-west-2:123456789012:ingest-configuration/AbCdEfGh1234

This command produces no output.

For more information, see `IVS Stream Ingest | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-stream-ingest.html>`__ in the *Amazon Interactive Video Service User Guide*.

**Example 2: To force delete an active ingest configuration**

The following ``delete-ingest-configuration`` example forces deletion of the active ingest configuration for a specified ingest-configuration ARN (Amazon Resource Name). ::

    aws ivs-realtime delete-ingest-configuration \
        --arn arn:aws:ivs:us-west-2:123456789012:ingest-configuration/AbCdEfGh1234 \
        --force

This command produces no output.

For more information, see `IVS Stream Ingest | Real-Time Streaming <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-stream-ingest.html>`__ in the *Amazon Interactive Video Service User Guide*.
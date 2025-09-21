**To delete a playback restriction policy**

The following ``delete-playback-restriction-policy`` example deletes the playback resriction policy with the specified policy ARN (Amazon Resource Name). ::

    aws ivs delete-playback-restriction-policy \
        --arn "arn:aws:ivs:us-west-2:123456789012:playback-restriction-policy/ABcdef34ghIJ"

This command produces no output.

For more information, see `Undesired Content and Viewers <https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/undesired-content.html>`__ in the *IVS Low-Latency User Guide*.

**To revoke a viewer session for a given multiple channel-ARN and viewer-ID pair**

The following ``start-viewer-session-revocation`` example starts the process of revoking the viewer session associated with a specified channel ARN and viewer ID, up to and including the specified session version number. If the version is not provided, it defaults to 0. ::

    aws ivs batch-start-viewer-session-revocation \
        --channel-arn arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh \
        --viewer-id abcdefg \
        --viewer-session-versions-less-than-or-equal-to 1234567890

This command produces no output.

For more information, see `Setting Up Private Channels <https://docs.aws.amazon.com/ivs/latest/userguide/private-channels.html>`__ in the *Amazon Interactive Video Service User Guide*.
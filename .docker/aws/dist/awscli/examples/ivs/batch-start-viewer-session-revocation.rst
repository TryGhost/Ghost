**To revoke viewer sessions for multiple channel-ARN and viewer-ID pairs**

The following ``batch-start-viewer-session-revocation`` example performs session revocation on multiple channel-ARN and viewer-ID pairs simultaneously. The request may complete normally but return values in the errors field if the caller does not have permission to revoke specified session. ::

    aws ivs batch-start-viewer-session-revocation \
        --viewer-sessions '[{"channelArn":"arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh1","viewerId":"abcdefg1","viewerSessionVersionsLessThanOrEqualTo":1234567890}, \
          {"channelArn":"arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh2","viewerId":"abcdefg2","viewerSessionVersionsLessThanOrEqualTo":1234567890}]'

Output::

    {
        "errors": [
            {
                "channelArn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh1",
                "viewerId": "abcdefg1",
                "code": "403",
                "message": "not authorized",
            },
            {
                "channelArn": "arn:aws:ivs:us-west-2:123456789012:channel/abcdABCDefgh2",
                "viewerId": "abcdefg2",
                "code": "403",
                "message": "not authorized",
            }
        ]
    }

For more information, see `Setting Up Private Channels <https://docs.aws.amazon.com/ivs/latest/userguide/private-channels.html>`__ in the *Amazon Interactive Video Service User Guide*.
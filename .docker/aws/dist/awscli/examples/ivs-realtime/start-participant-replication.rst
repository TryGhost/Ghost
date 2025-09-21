**To start replicating a participant from one stage to another stage**

The following ``start-participant-replication`` example replicates a participant from a source stage to a destination stage, with each stage specified by its ARN (Amazon Resource Name). ::

    aws ivs-realtime start-participant-replication \
        --source-stage-arn arn:aws:ivs:us-west-2:123456789012:stage/abcdABCDefgh \
        --destination-stage-arn arn:aws:ivs:us-west-2:234567890123:stage/bcdABCDefghi \
        --participant-id abCDEf12GHIj

Output::

    {
        "accessControlAllowOrigin": "*",
        "accessControlExposeHeaders": "Access-Control-Allow-Origin,Access-Control-Expose-Headers,Cache-Control,Content-Length, \
        Content-Security-Policy,Content-Type,date,Strict-Transport-Security,x-amz-apigw-id,x-amzn-errormessage,x-amzn-errortype, \
        x-amzn-requestid,x-amzn-trace-id,X-Content-Type-Options,X-Frame-Options",
        "cacheControl": "no-store, no-cache",
        "contentSecurityPolicy": "default-src 'self'; upgrade-insecure-requests;",
        "strictTransportSecurity": "max-age:47304000; includeSubDomains",
        "xContentTypeOptions": "nosniff",
        "xFrameOptions": "DENY"
    }

For more information, see `IVS Participant Replication <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/rt-participant-replication.html>`__ in the *Amazon IVS Real-Time Streaming User Guide*.
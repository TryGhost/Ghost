**To stop a flow**

The following ``stop-flow`` example stops the specified flow. ::

    aws mediaconnect stop-flow \
        --flow-arn arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow

Output::

    {
        "Status": "STOPPING",
        "FlowArn": "arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow"
    }

For more information, see `Stopping a Flow <https://docs.aws.amazon.com/mediaconnect/latest/ug/flows-stop.html>`__ in the *AWS Elemental MediaConnect User Guide*.

**To start a flow**

The following ``start-flow`` example starts the specified flow. ::

    aws mediaconnect start-flow \
        --flow-arn arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow

This command produces no output.
Output::

    {
        "FlowArn": "arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow",
        "Status": "STARTING"
    }

For more information, see `Starting a Flow <https://docs.aws.amazon.com/mediaconnect/latest/ug/flows-start.html>`__ in the *AWS Elemental MediaConnect User Guide*.

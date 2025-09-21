**To delete a flow**

The following ``delete-flow`` example deletes the specified flow. ::

    aws mediaconnect delete-flow \
        --flow-arn arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow

Output::

    {
        "FlowArn": "arn:aws:mediaconnect:us-east-1:123456789012:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:AwardsShow",
        "Status": "DELETING"
    }

For more information, see `Deleting a Flow <https://docs.aws.amazon.com/mediaconnect/latest/ug/flows-delete.html>`__ in the *AWS Elemental MediaConnect User Guide*.

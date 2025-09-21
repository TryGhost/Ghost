**To remove an output from a flow**

The following ``remove-flow-output`` example removes an output from the specified flow. ::

    aws mediaconnect remove-flow-output \
        --flow-arn arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame \
        --output-arn arn:aws:mediaconnect:us-east-1:111122223333:output:2-3aBC45dEF67hiJ89-c34de5fG678h:NYC

Output::

    {
        "FlowArn": "arn:aws:mediaconnect:us-east-1:111122223333:flow:1-23aBC45dEF67hiJ8-12AbC34DE5fG:BaseballGame",
        "OutputArn": "arn:aws:mediaconnect:us-east-1:111122223333:output:2-3aBC45dEF67hiJ89-c34de5fG678h:NYC"
    }

For more information, see `Removing Outputs from a Flow <https://docs.aws.amazon.com/mediaconnect/latest/ug/outputs-remove.html>`__ in the *AWS Elemental MediaConnect User Guide*.

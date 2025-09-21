**To get the instance types on your Outpost**

The following ``get-outpost-instance-types`` example gets the instance types for the specified Outpost. ::

    aws outposts get-outpost-instance-types \
        --outpost-id op-0ab23c4567EXAMPLE

Output::

    {
        "InstanceTypes": [
            {
                "InstanceType": "c5d.large"
            },
            {
                "InstanceType": "i3en.24xlarge"
            },
            {
                "InstanceType": "m5d.large"
            },
            {
                "InstanceType": "r5d.large"
            }
        ],
        "OutpostId": "op-0ab23c4567EXAMPLE",
        "OutpostArn": "arn:aws:outposts:us-west-2:123456789012:outpost/op-0ab23c4567EXAMPLE"
    }

For more information, see `Launch an instance on your Outpost <https://docs.aws.amazon.com/outposts/latest/userguide/launch-instance.html>`__ in the *AWS Outposts User Guide*.

**To list Outposts**

The following ``list-outposts`` example lists the Outposts in your AWS account. ::

    aws outposts list-outposts

Output::

    {
        "Outposts": [
            {
                "OutpostId": "op-0ab23c4567EXAMPLE",
                "OwnerId": "123456789012",
                "OutpostArn": "arn:aws:outposts:us-west-2:123456789012:outpost/op-0ab23c4567EXAMPLE",
                "SiteId": "os-0ab12c3456EXAMPLE",
                "Name": "EXAMPLE",
                "Description": "example",
                "LifeCycleStatus": "ACTIVE",
                "AvailabilityZone": "us-west-2a",
                "AvailabilityZoneId": "usw2-az1",
                "Tags": {
                    "Name": "EXAMPLE"
                }
            },
            {
                "OutpostId": "op-4fe3dc21baEXAMPLE",
                "OwnerId": "123456789012",
                "OutpostArn": "arn:aws:outposts:us-west-2:123456789012:outpost/op-4fe3dc21baEXAMPLE",
                "SiteId": "os-0ab12c3456EXAMPLE",
                "Name": "EXAMPLE2",
                "LifeCycleStatus": "ACTIVE",
                "AvailabilityZone": "us-west-2a",
                "AvailabilityZoneId": "usw2-az1",
                "Tags": {}
            }
        ]
    }

For more information, see `Working with Outposts <https://docs.aws.amazon.com/outposts/latest/userguide/work-with-outposts.html>`__ in the *AWS Outposts User Guide*.

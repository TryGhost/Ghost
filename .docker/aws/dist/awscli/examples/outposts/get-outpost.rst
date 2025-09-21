**To get Outpost details**

The following ``get-outpost`` example displays the details for the specified Outpost. ::

    aws outposts get-outpost \
        --outpost-id op-0ab23c4567EXAMPLE

Output::

    {
        "Outpost": {
            "OutpostId": "op-0ab23c4567EXAMPLE",
            "OwnerId": "123456789012",
            "OutpostArn": "arn:aws:outposts:us-west-2:123456789012:outpost/op-0ab23c4567EXAMPLE",
            "SiteId": "os-0ab12c3456EXAMPLE",
            "Name": "EXAMPLE",
            "LifeCycleStatus": "ACTIVE",
            "AvailabilityZone": "us-west-2a",
            "AvailabilityZoneId": "usw2-az1",
            "Tags": {}
        }
    }

For more information, see `Working with Outposts <https://docs.aws.amazon.com/outposts/latest/userguide/work-with-outposts.html>`__ in the *AWS Outposts User Guide*.

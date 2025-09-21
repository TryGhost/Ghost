**To retrieve the tags attached to a resource group**

The following ``get-tags`` example displays the tag key and value pairs attached to the specified resource group (the group itself, not its members). ::

    aws resource-groups get-tags \
        --arn arn:aws:resource-groups:us-west-2:123456789012:group/tbq-WebServer

Output::

    {
        "Arn": "arn:aws:resource-groups:us-west-2:123456789012:group/tbq-WebServer",
        "Tags": {
            "QueryType": "tags",
            "QueryResources": "ec2-instances"
        }
    }

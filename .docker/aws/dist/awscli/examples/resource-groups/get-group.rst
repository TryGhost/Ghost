**To get information about a resource group**

The following ``get-group`` example displays details about the specified resource group. To get the query attached to the group, use ``get-group-query``. ::

    aws resource-groups get-group \
        --group-name tbq-WebServer

Output::

    {
        "Group": {
            "GroupArn": "arn:aws:resource-groups:us-west-2:123456789012:group/tbq-WebServer",
            "Name": "tbq-WebServer",
            "Description": "A tag-based query resource group of WebServers."
        }
    }

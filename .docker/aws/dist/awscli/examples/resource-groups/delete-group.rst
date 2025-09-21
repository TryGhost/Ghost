**To update the description for a resource group**

The following ``delete-group`` example updates the specified resource group. ::

    aws resource-groups delete-group \
        --group-name tbq-WebServer

Output::

    {
        "Group": {
            "GroupArn": "arn:aws:resource-groups:us-west-2:1234567890:group/tbq-WebServer",
            "Name": "tbq-WebServer"
        }
    }

For more information, see `Delete Groups <https://docs.aws.amazon.com/ARG/latest/userguide/deleting-resource-groups.html>`__ in the *AWS Resource Groups User Guide*.

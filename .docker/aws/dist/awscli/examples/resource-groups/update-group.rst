**To update the description for a resource group**

The following ``update-group`` example updates the description for the specified resource group. ::

    aws resource-groups update-group \
        --group-name tbq-WebServer \
        --description "Resource group for all web server resources."

Output::

    {
        "Group": {
            "GroupArn": "arn:aws:resource-groups:us-west-2:123456789012:group/tbq-WebServer",
            "Name": "tbq-WebServer"
            "Description": "Resource group for all web server resources."
        }
    }

For more information, see `Update Groups <https://docs.aws.amazon.com/ARG/latest/userguide/updating-resource-groups.html>`__ in the *AWS Resource Groups User Guide*.

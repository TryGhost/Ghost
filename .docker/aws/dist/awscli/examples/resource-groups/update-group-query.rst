**Example 1: To update the query for a tag-based resource group**

The following ``update-group-query`` example updates the query attached to the specified tag-based resource group. ::

    aws resource-groups update-group-query \
        --group-name tbq-WebServer \
        --resource-query '{"Type":"TAG_FILTERS_1_0", "Query":"{\"ResourceTypeFilters\":[\"AWS::EC2::Instance\"],\"TagFilters\":[{\"Key\":\"Name\", \"Values\":[\"WebServers\"]}]}"}'

Output::

    {
        "Group": {
            "GroupArn": "arn:aws:resource-groups:us-east-2:123456789012:group/tbq-WebServer",
            "Name": "tbq-WebServer"
        },
        "ResourceQuery": {
            "Type": "TAG_FILTERS_1_0",
            "Query": "{\"ResourceTypeFilters\":[\"AWS::EC2::Instance\"],\"TagFilters\":[{\"Key\":\"Name\", \"Values\":[\"WebServers\"]}]}"
        }
    }

For more information, see `Update Groups <https://docs.aws.amazon.com/ARG/latest/userguide/updating-resource-groups.html>`__ in the *AWS Resource Groups User Guide*.

**Example 2: To update the query for a CloudFormation stack-based resource group**

The following ``update-group-query`` example updates the query attached to the specified AWS CloudFormation stack-based resource group. ::

    aws resource-groups update-group-query \
        --group-name cbq-CFNstackgroup \
        --resource-query '{"Type": "CLOUDFORMATION_STACK_1_0", "Query": "{\"ResourceTypeFilters\":[\"AWS::AllSupported\"],\"StackIdentifier\":\"arn:aws:cloudformation:us-west-2:123456789012:stack/MyCFNStack/1415z9z0-z39z-11z8-97z5-500z212zz6fz\"}"}'

Output::

    {
        "Group": {
            "GroupArn": "arn:aws:resource-groups:us-west-2:123456789012:group/cbq-CFNstackgroup",
            "Name": "cbq-CFNstackgroup"
        },
        "ResourceQuery": {
            "Type": "CLOUDFORMATION_STACK_1_0",
            "Query": "{\"ResourceTypeFilters\":[\"AWS::AllSupported\"],\"StackIdentifier\":\"arn:aws:cloudformation:us-west-2:123456789012:stack/MyCFNStack/1415z9z0-z39z-11z8-97z5-500z212zz6fz\"}"
        }
    }

For more information, see `Update Groups <https://docs.aws.amazon.com/ARG/latest/userguide/updating-resource-groups.html>`__ in the *AWS Resource Groups User Guide*.

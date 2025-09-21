**Example 1: To create a tag-based resource group**

The following ``create-group`` example creates a tag-based resource group of Amazon EC2 instances in the current region. It's based on a query for resources that are tagged with the key ``Name``, and the value ``WebServers``. The group name is ``tbq-WebServer``. The query is in a separate JSON file that is passed to the command. ::

    aws resource-groups create-group \
        --name tbq-WebServer \
        --resource-query file://query.json

Contents of ``query.json``::

    {
        "Type": "TAG_FILTERS_1_0",
        "Query": "{\"ResourceTypeFilters\":[\"AWS::EC2::Instance\"],\"TagFilters\":[{\"Key\":\"Name\", \"Values\":[\"WebServers\"]}]}"
    }

Output::

    {
        "Group": {
            "GroupArn": "arn:aws:resource-groups:us-west-2:123456789012:group/tbq-WebServer",
            "Name": "tbq-WebServer"
        },
        "ResourceQuery": {
            "Type": "TAG_FILTERS_1_0",
            "Query": "{\"ResourceTypeFilters\":[\"AWS::EC2::Instance\"],\"TagFilters\":[{\"Key\":\"Name\", \"Values\":[\"WebServers\"]}]}"
        }
    }

**Example 2: To create a CloudFormation stack-based resource group**

The following ``create-group`` example creates an AWS CloudFormation stack-based resource group named ``sampleCFNstackgroup``. The query includes all resources in the specified CloudFormation stack that are supported by AWS Resource Groups. ::

    aws resource-groups create-group \
        --name cbq-CFNstackgroup \
        --resource-query file://query.json

Contents of ``query.json``::

    {
        "Type": "CLOUDFORMATION_STACK_1_0",
        "Query": "{\"ResourceTypeFilters\":[\"AWS::AllSupported\"],\"StackIdentifier\":\"arn:aws:cloudformation:us-west-2:123456789012:stack/MyCFNStack/1415z9z0-z39z-11z8-97z5-500z212zz6fz\"}"
    }

Output::

    {
        "Group": {
            "GroupArn": "arn:aws:resource-groups:us-west-2:123456789012:group/cbq-CFNstackgroup",
            "Name": "cbq-CFNstackgroup"
        },
        "ResourceQuery": {
            "Type": "CLOUDFORMATION_STACK_1_0",
            "Query": "{\"ResourceTypeFilters\":[\"AWS::AllSupported\"],\"StackIdentifier\":\"arn:aws:cloudformation:us-east-2:123456789012:stack/MyCFNStack/1415z9z0-z39z-11z8-97z5-500z212zz6fz\"}"}'
        }
    }

For more information, see `Create Groups <https://docs.aws.amazon.com/ARG/latest/userguide/gettingstarted-query.html>`__ in the *AWS Resource Groups User Guide*.

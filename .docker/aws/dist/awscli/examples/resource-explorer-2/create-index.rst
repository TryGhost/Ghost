**To turn on Resource Explorer in an AWS Region by creating an index**

The following ``create-index`` example creates a local index in the AWS Region in which the operation is called. The AWS CLI automatically generates a random ``client-token`` parameter value and includes it in the call to AWS if you don't specify a value. ::

    aws resource-explorer-2 create-index \
        --region us-east-1

Output::

    {
        "Arn": "arn:aws:resource-explorer-2:us-east-1:123456789012:index/EXAMPLE8-90ab-cdef-fedc-EXAMPLE22222c",
        "CreatedAt": "2022-11-01T20:00:59.149Z",
        "State": "CREATING"
    }

After you create a local index, you can convert it into the aggregator index for the account by running the `update-index-type <https://docs.aws.amazon.com/cli/latest/reference/resource-explorer-2/update-index-type.html>`__ command.

For more information, see `Turning on Resource Explorer in an AWS Region to index your resources <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-service-register.html>`__ in the *AWS Resource Explorer Users Guide*.
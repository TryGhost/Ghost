**To create a Greeengrass group**

The following ``create-group`` example creates a group named ``cli-created-group``. ::

    aws greengrass create-group \
        --name cli-created-group

Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/4e22bd92-898c-436b-ade5-434d883ff749",
        "CreationTimestamp": "2019-06-25T18:07:17.688Z",
        "Id": "4e22bd92-898c-436b-ade5-434d883ff749",
        "LastUpdatedTimestamp": "2019-06-25T18:07:17.688Z",
        "Name": "cli-created-group"
    }

For more information, see `Overview of the AWS IoT Greengrass Group Object Model <https://docs.aws.amazon.com/greengrass/latest/developerguide/deployments.html#api-overview>`__ in the *AWS IoT Greengrass Developer Guide*.
**To retrieve information about a resource definition**

The following ``get-resource-definition`` example retrieves information about the specified resource definition. To retrieve the IDs of your resource definitions, use the ``list-resource-definitions`` command. ::

    aws greengrass get-resource-definition \
        --resource-definition-id "ad8c101d-8109-4b0e-b97d-9cc5802ab658"

Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/ad8c101d-8109-4b0e-b97d-9cc5802ab658",
        "CreationTimestamp": "2019-06-19T16:40:59.261Z",
        "Id": "ad8c101d-8109-4b0e-b97d-9cc5802ab658",
        "LastUpdatedTimestamp": "2019-06-19T16:40:59.261Z",
        "LatestVersion": "26e8829a-491a-464d-9c87-664bf6f6f2be",
        "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/ad8c101d-8109-4b0e-b97d-9cc5802ab658/versions/26e8829a-491a-464d-9c87-664bf6f6f2be",
        "tags": {}
    }

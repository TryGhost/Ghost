**To list the versions of a resource definition**

The following ``list-resource-definition-versions`` example lists the versions for the specified Greengrass resource. ::

    aws greengrass list-resource-definition-versions \
        --resource-definition-id "ad8c101d-8109-4b0e-b97d-9cc5802ab658"
    
Output::

    {
        "Versions": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/ad8c101d-8109-4b0e-b97d-9cc5802ab658/versions/26e8829a-491a-464d-9c87-664bf6f6f2be",
                "CreationTimestamp": "2019-06-19T16:40:59.392Z",
                "Id": "ad8c101d-8109-4b0e-b97d-9cc5802ab658",
                "Version": "26e8829a-491a-464d-9c87-664bf6f6f2be"
            },
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/ad8c101d-8109-4b0e-b97d-9cc5802ab658/versions/432d92f6-12de-4ec9-a704-619a942a62aa",
                "CreationTimestamp": "2019-06-19T16:40:59.261Z",
                "Id": "ad8c101d-8109-4b0e-b97d-9cc5802ab658",
                "Version": "432d92f6-12de-4ec9-a704-619a942a62aa"
            }
        ]
    }

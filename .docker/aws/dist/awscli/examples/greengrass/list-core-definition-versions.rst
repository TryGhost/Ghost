**To list the versions of a Greengrass core definition**

The following ``list-core-definitions`` example lists all versions of the specied Greengrass core definition. You can use the ``list-core-definitions`` command to get the version ID. ::

    aws greengrass list-core-definition-versions \
        --core-definition-id "eaf280cb-138c-4d15-af36-6f681a1348f7"
    
Output::

    {
        "Versions": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/eaf280cb-138c-4d15-af36-6f681a1348f7/versions/467c36e4-c5da-440c-a97b-084e62593b4c",
                "CreationTimestamp": "2019-06-18T16:14:17.709Z",
                "Id": "eaf280cb-138c-4d15-af36-6f681a1348f7",
                "Version": "467c36e4-c5da-440c-a97b-084e62593b4c"
            }
        ]
    }

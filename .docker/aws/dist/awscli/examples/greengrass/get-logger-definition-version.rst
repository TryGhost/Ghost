**To retrieve information about a version of a logger definition**

The following ``get-logger-definition-version`` example retrieves information about the specified version of the specified logger definition. To retrieve the IDs of all versions of the logger definition, use the ``list-logger-definition-versions`` command. To retrieve the ID of the last version added to the logger definition, use the ``get-logger-definition`` command and check the ``LatestVersion`` property. ::

    aws greengrass get-logger-definition-version \
        --logger-definition-id "49eeeb66-f1d3-4e34-86e3-3617262abf23" \
        --logger-definition-version-id "5e3f6f64-a565-491e-8de0-3c0d8e0f2073"
    
Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/loggers/49eeeb66-f1d3-4e34-86e3-3617262abf23/versions/5e3f6f64-a565-491e-8de0-3c0d8e0f2073",
        "CreationTimestamp": "2019-05-08T16:10:13.866Z",
        "Definition": {
            "Loggers": []
        },
        "Id": "49eeeb66-f1d3-4e34-86e3-3617262abf23",
        "Version": "5e3f6f64-a565-491e-8de0-3c0d8e0f2073"
    }

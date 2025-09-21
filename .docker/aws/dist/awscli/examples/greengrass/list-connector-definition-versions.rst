**To list the versions that are available for a connector definition**

The following ``list-connector-definition-versions`` example lists the versions that are available for the specified connector definition. Use the ``list-connector-definitions`` command to get the connector definition ID. ::

    aws greengrass list-connector-definition-versions \
        --connector-definition-id "b5c4ebfd-f672-49a3-83cd-31c7216a7bb8"

Output::

    {
        "Versions": [
            {
                "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/connectors/b5c4ebfd-f672-49a3-83cd-31c7216a7bb8/versions/63c57963-c7c2-4a26-a7e2-7bf478ea2623",
                "CreationTimestamp": "2019-06-19T19:30:01.300Z",
                "Id": "b5c4ebfd-f672-49a3-83cd-31c7216a7bb8",
                "Version": "63c57963-c7c2-4a26-a7e2-7bf478ea2623"
            }
        ]
    }

For more information, see `Integrate with Services and Protocols Using Greengrass Connectors <https://docs.aws.amazon.com/greengrass/latest/developerguide/connectors.html>`__ in the **AWS IoT Greengrass Developer Guide**.

**To retreive information about a specific version of a connector definition**

The following ``get-connector-definition-version`` example retrieves information about the specified version of the specified connector definition. To retrieve the IDs of all versions of the connector definition, use the ``list-connector-definition-versions`` command. To retrieve the ID of the last version added to the connector definition, use the ``get-connector-definition`` command and check the ``LatestVersion`` property. ::

    aws greengrass get-connector-definition-version \
        --connector-definition-id "b5c4ebfd-f672-49a3-83cd-31c7216a7bb8" \
        --connector-definition-version-id "63c57963-c7c2-4a26-a7e2-7bf478ea2623"

Output::

   {
       "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/connectors/b5c4ebfd-f672-49a3-83cd-31c7216a7bb8/versions/63c57963-c7c2-4a26-a7e2-7bf478ea2623",
       "CreationTimestamp": "2019-06-19T19:30:01.300Z",
       "Definition": {
           "Connectors": [
               {
                   "ConnectorArn": "arn:aws:greengrass:us-west-2::/connectors/SNS/versions/1",
                   "Id": "MySNSConnector",
                   "Parameters": {
                       "DefaultSNSArn": "arn:aws:sns:us-west-2:123456789012:GGConnectorTopic"
                   }
               }
           ]
       },
       "Id": "b5c4ebfd-f672-49a3-83cd-31c7216a7bb8",
       "Version": "63c57963-c7c2-4a26-a7e2-7bf478ea2623"
   }

For more information, see `Integrate with Services and Protocols Using Greengrass Connectors <https://docs.aws.amazon.com/greengrass/latest/developerguide/connectors.html>`__ in the **AWS IoT Greengrass Developer Guide**.

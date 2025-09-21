**To update the name for a connector definition**

The following ``update-connector-definition`` example updates the name for the specified connector definition. If you want to update the details for the connector, use the ``create-connector-definition-version`` command to create a new version. ::

    aws greengrass update-connector-definition \
        --connector-definition-id "55d0052b-0d7d-44d6-b56f-21867215e118" \
        --name "GreengrassConnectors2019"

For more information, see `Integrate with Services and Protocols Using Connectors <https://docs.aws.amazon.com/greengrass/latest/developerguide/connectors.html>`__ in the *AWS IoT Greengrass Developer Guide*.

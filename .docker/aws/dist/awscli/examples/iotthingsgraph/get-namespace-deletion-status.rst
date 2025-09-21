**To get the status of the namespace deletion task**

The following ``get-namespace-deletion-status`` example gets the status of the namespace deletion task. ::

    aws iotthingsgraph get-namespace-deletion-status

Output::

    {
       "namespaceArn": "arn:aws:iotthingsgraph:us-west-2:123456789012",
       "namespaceName": "us-west-2/123456789012/default"
       "status": "SUCCEEDED "
    }

For more information, see `Namespaces <https://docs.aws.amazon.com/thingsgraph/latest/ug/iot-tg-whatis-namespace.html>`__ in the *AWS IoT Things Graph User Guide*.

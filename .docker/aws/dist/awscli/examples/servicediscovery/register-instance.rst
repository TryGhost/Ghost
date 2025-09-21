**To register a service instance**

The following ``register-instance`` example registers a service instance. ::

    aws servicediscovery register-instance \
        --service-id srv-p5zdwlg5uvvzjita \
        --instance-id myservice-53 \
        --attributes=AWS_INSTANCE_IPV4=172.2.1.3,AWS_INSTANCE_PORT=808

Output::

    {
        "OperationId": "4yejorelbukcjzpnr6tlmrghsjwpngf4-k95yg2u7"
    }

To confirm that the operation succeeded, you can run ``get-operation``. For more information, see `get-operation <https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/get-operation.html>`__ .

For more information, see `Registering instances <https://docs.aws.amazon.com/cloud-map/latest/dg/registering-instances.html>`__ in the *AWS Cloud Map Developer Guide*.


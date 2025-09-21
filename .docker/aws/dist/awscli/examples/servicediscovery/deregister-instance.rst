**To deregister a service instance**

The following ``deregister-instance`` example deregisters a service instance. ::

    aws servicediscovery deregister-instance \
        --service-id srv-p5zdwlg5uvvzjita \
        --instance-id myservice-53

Output::

    {
        "OperationId": "4yejorelbukcjzpnr6tlmrghsjwpngf4-k98rnaiq"
    }

To confirm that the operation succeeded, you can run ``get-operation``. For more information, see `get-operation <https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/get-operation.html>`__ .

For more information, see `Deregistering service instances <https://docs.aws.amazon.com/cloud-map/latest/dg/deregistering-instances.html>`__ in the *AWS Cloud Map Developer Guide*.


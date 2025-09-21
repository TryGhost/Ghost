**To delete a namespace**

The following ``delete-namespace`` example deletes a namespace. ::

    aws servicediscovery delete-namespace \
        --id ns-ylexjili4cdxy3xm

Output::

    {
        "OperationId": "gv4g5meo7ndmeh4fqskygvk23d2fijwa-k98y6drk"
    }

To confirm that the operation succeeded, you can run ``get-operation``. For more information, see `get-operation <https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/get-operation.html>`__ .

For more information, see `Deleting namespaces <https://docs.aws.amazon.com/cloud-map/latest/dg/deleting-namespaces.html>`__ in the *AWS Cloud Map Developer Guide*.


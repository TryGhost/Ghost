**To create a private DNS namespace**

The following ``create-private-dns-namespace`` example creates a private DNS namespace. ::

    aws servicediscovery create-private-dns-namespace \
        --name example.com \
        --vpc vpc-1c56417b

Output::

    {
        "OperationId": "gv4g5meo7ndmeh4fqskygvk23d2fijwa-k9302yzd"
    }

To confirm that the operation succeeded, you can run ``get-operation``. For more information, see `get-operation <https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/get-operation.html>`__ .

For more information, see `Creating namespaces <https://docs.aws.amazon.com/cloud-map/latest/dg/creating-namespaces.html>`__ in the *AWS Cloud Map Developer Guide*.


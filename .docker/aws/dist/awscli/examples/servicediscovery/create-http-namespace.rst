**To create an HTTP namespace**

The following ``create-http-namespace`` example creates an HTTP namespace ``example.com``. ::

    aws servicediscovery create-http-namespace \
        --name example.com \
        --creator-request-id example-request-id

Output::

    {
        "OperationId": "gv4g5meo7ndmeh4fqskygvk23d2fijwa-k9302yzd"
    }

To confirm that the operation succeeded, you can run ``get-operation``. For more information, see `get-operation <https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/get-operation.html>`__ .

For more information about creating a namespace, see `Creating an AWS Cloud Map namespace to group application services <https://docs.aws.amazon.com/cloud-map/latest/dg/creating-namespaces.html>`__ in the *AWS Cloud Map Developer Guide*.

**To update an HTTP namespace**

The following ``update-http-namespace`` example updates the specified HTTP namespace's description. ::

    aws servicediscovery update-http-namespace \
        --id ns-vh4nbmEXAMPLE \
        --updater-request-id example-request-id \
        --namespace Description="The updated namespace description."

Output::

    {
        "OperationId": "gv4g5meo7ndmeh4fqskygvk23d2fijwa-k9302yzd"
    }

To confirm that the operation succeeded, you can run ``get-operation``. For more information, see `get-operation <https://docs.aws.amazon.com/cli/latest/reference/servicediscovery/get-operation.html>`__ .

For more information, see `AWS Cloud Map namespaces <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-namespaces.html>`__ in the *AWS Cloud Map Developer Guide*.
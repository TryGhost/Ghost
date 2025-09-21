**To update a private DNS namespace**

The following ``update-private-dns-namespace`` example updates the description of a private DNS namespace. ::

    aws servicediscovery update-private-dns-namespace \
        --id ns-bk3aEXAMPLE \
        --updater-request-id example-private-request-id \
        --namespace Description="The updated namespace description."

Output::

    {
        "OperationId": "gv4g5meo7ndmeh4fqskygvk23d2fijwa-k9302yzd"
    }

To confirm that the operation succeeded, you can run ``get-operation``.

For more information, see `AWS Cloud Map namespaces <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-namespaces.html>`__ in the *AWS Cloud Map Developer Guide*.

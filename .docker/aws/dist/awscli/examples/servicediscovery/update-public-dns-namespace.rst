**To update a public DNS namespace**

The following ``update-public-dns-namespace`` example updates the description of a public DNS namespace. ::

    aws servicediscovery update-public-dns-namespace \
        --id ns-bk3aEXAMPLE \
        --updater-request-id example-public-request-id \
        --namespace Description="The updated namespace description."

Output::

    {
        "OperationId": "gv4g5meo7ndmeh4fqskygvk23d2fijwa-k9302yzd"
    }

To confirm that the operation succeeded, you can run ``get-operation``.

For more information, see `AWS Cloud Map namespaces <https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-namespaces.html>`__ in the *AWS Cloud Map Developer Guide*.

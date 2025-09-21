**To create an public DNS namespace**

The following ``create-public-dns-namespace`` example creates an public DNS namespace ``example.com``. ::

    aws servicediscovery create-public-dns-namespace \
        --name example-public-dns.com \
        --creator-request-id example-public-request-id \
        --properties DnsProperties={SOA={TTL=60}}

Output::

    {
        "OperationId": "gv4g5meo7ndmeh4fqskygvk23d2fijwa-k9302yzd"
    }

To confirm that the operation succeeded, you can run ``get-operation``.

For more information about creating a namespace, see `Creating an AWS Cloud Map namespace to group application services <https://docs.aws.amazon.com/cloud-map/latest/dg/creating-namespaces.html>`__ in the *AWS Cloud Map Developer Guide*.

**To update a service**

The following ``update-service`` example updates a service to update the ``DnsConfig`` and ``HealthCheckConfig`` settings. ::

    aws servicediscovery update-service \
        --id srv-e4anhexample0004 \
        --service "DnsConfig={DnsRecords=[{"Type"="A","TTL"=60}]},HealthCheckConfig={"Type"="HTTP","ResourcePath"="/","FailureThreshold"="2"}"

Output::

    {
        "OperationId": "gv4g5meo7ndmeh4fqskygvk23d2fijwa-k9302yzd"
    }

To confirm that the operation succeeded, you can run ``get-operation``.

For more information about updating a service, see `Updating an AWS Cloud Map service <https://docs.aws.amazon.com/cloud-map/latest/dg/editing-services.html>`__ in the *AWS Cloud Map Developer Guide*.

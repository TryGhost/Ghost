**To delete a virtual service**

The following ``delete-virtual-service`` example deletes the specified virtual service. ::

    aws appmesh delete-virtual-service \
        --mesh-name app1 \
        --virtual-service-name serviceB.svc.cluster.local

Output::

    {
        "virtualService": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1/virtualService/serviceB.svc.cluster.local",
                "createdAt": 1563908363.999,
                "lastUpdatedAt": 1563913940.866,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 3
            },
            "spec": {},
            "status": {
                "status": "DELETED"
            },
            "virtualServiceName": "serviceB.svc.cluster.local"
        }
    }

For more information, see `Virtual Service <https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_services.html>`__ in the *AWS App Mesh User Guide*.

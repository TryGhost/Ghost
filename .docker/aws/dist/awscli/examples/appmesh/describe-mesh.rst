**To describe a service mesh**

The following ``describe-mesh`` example returns details about the specified service mesh. ::

    aws appmesh describe-mesh \
        --mesh-name app1
        
Output::

    {
        "mesh": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1",
                "createdAt": 1563809909.282,
                "lastUpdatedAt": 1563809909.282,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 1
            },
            "spec": {},
            "status": {
                "status": "ACTIVE"
            }
        }
    }

For more information, see `Service Meshes <https://docs.aws.amazon.com/app-mesh/latest/userguide/meshes.html>`__ in the *AWS App Mesh User Guide*.

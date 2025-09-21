**To delete a service mesh**

The following ``delete-mesh`` example deletes the specified service mesh. ::

    aws appmesh delete-mesh \
        --mesh-name app1
        
Output::

    {
        "mesh": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1",
                "createdAt": 1563809909.282,
                "lastUpdatedAt": 1563824981.248,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 2
            },
            "spec": {
                "egressFilter": {
                    "type": "ALLOW_ALL"
                }
            },
            "status": {
                "status": "DELETED"
            }
        }
    }

For more information, see `Service Meshes <https://docs.aws.amazon.com/app-mesh/latest/userguide/meshes.html>`__ in the *AWS App Mesh User Guide*.

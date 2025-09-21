**To update a service mesh**

The following ``update-mesh`` example uses a JSON input file to update a service mesh to allow all external egress traffic to be forwarded through the Envoy proxy untouched. ::

    aws appmesh update-mesh \
        --cli-input-json file://update-mesh.json

Contents of ``update-mesh.json``::

    {
        "meshName": "app1",
        "spec": {
            "egressFilter": {
                "type": "ALLOW_ALL"
            }
        }
    }

Output::

    {
        "mesh": {
            "meshName": "app1",
            "metadata": {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1",
                "createdAt": 1563809909.282,
                "lastUpdatedAt": 1563812829.687,
                "uid": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version": 2
            },
            "spec": {
                "egressFilter": {
                    "type": "ALLOW_ALL"
                }
            },
            "status": {
                "status": "ACTIVE"
            }
        }
    }

For more information, see `Service Meshes <https://docs.aws.amazon.com/app-mesh/latest/userguide/meshes.html>`__ in the *AWS App Mesh User Guide*.

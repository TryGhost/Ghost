**Example 1: To create a new service mesh**

The following ``create-mesh`` example creates a service mesh. ::

    aws appmesh create-mesh \
        --mesh-name app1

Output::

    {
        "mesh":{
            "meshName":"app1",
            "metadata":{
                "arn":"arn:aws:appmesh:us-east-1:123456789012:mesh/app1",
                "createdAt":1563809909.282,
                "lastUpdatedAt":1563809909.282,
                "uid":"a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version":1
            },
            "spec":{},
            "status":{
                "status":"ACTIVE"
            }
        }
    }

**Example 2: To create a new service mesh with multiple tags**

The following ``create-mesh`` example creates a service mesh with multiple tags. ::

    aws appmesh create-mesh \
        --mesh-name app2 \
        --tags key=key1,value=value1 key=key2,value=value2 key=key3,value=value3

Output::

    {
        "mesh":{
            "meshName":"app2",
            "metadata":{
                "arn":"arn:aws:appmesh:us-east-1:123456789012:mesh/app2",
                "createdAt":1563822121.877,
                "lastUpdatedAt":1563822121.877,
                "uid":"a1b2c3d4-5678-90ab-cdef-11111EXAMPLE",
                "version":1
            },
            "spec":{},
            "status":{
                "status":"ACTIVE"
            }
        }
    }

For more information, see `Service Meshes <https://docs.aws.amazon.com/app-mesh/latest/userguide/meshes.html>`__ in the *AWS App Mesh User Guide*.

**To list service meshes**

The following ``list-meshes`` example lists all of the service meshes in the current AWS Region. ::

    aws appmesh list-meshes
    
Output::

    {
        "meshes": [
            {
                "arn": "arn:aws:appmesh:us-east-1:123456789012:mesh/app1",
                "meshName": "app1"
            }
        ]
    }

For more information, see `Service Meshes <https://docs.aws.amazon.com/app-mesh/latest/userguide/meshes.html>`__ in the *AWS App Mesh User Guide*.

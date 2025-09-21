**To list the images in a repository**

The following ``list-images`` example displays a list of the images in the ``cluster-autoscaler`` repository. ::

    aws ecr list-images \
        --repository-name cluster-autoscaler

Output::

    {
        "imageIds": [
            {
                "imageDigest": "sha256:99c6fb4377e9a420a1eb3b410a951c9f464eff3b7dbc76c65e434e39b94b6570",
                "imageTag": "v1.13.8"
            },
            {
                "imageDigest": "sha256:99c6fb4377e9a420a1eb3b410a951c9f464eff3b7dbc76c65e434e39b94b6570",
                "imageTag": "v1.13.7"
            },
            {
                "imageDigest": "sha256:4a1c6567c38904384ebc64e35b7eeddd8451110c299e3368d2210066487d97e5",
                "imageTag": "v1.13.6"
            }
        ]
    }

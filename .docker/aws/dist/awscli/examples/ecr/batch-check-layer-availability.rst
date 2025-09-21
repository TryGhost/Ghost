**To check the availability of a layer**

The following ``batch-check-layer-availability`` example checks the availability of a layer with the digest ``sha256:6171c7451a50945f8ddd72f7732cc04d7a0d1f48138a426b2e64387fdeb834ed`` in the ``cluster-autoscaler`` repository. ::

    aws ecr batch-check-layer-availability \
        --repository-name cluster-autoscaler \
        --layer-digests sha256:6171c7451a50945f8ddd72f7732cc04d7a0d1f48138a426b2e64387fdeb834ed
  
Output::

    {
        "layers": [
            {
                "layerDigest": "sha256:6171c7451a50945f8ddd72f7732cc04d7a0d1f48138a426b2e64387fdeb834ed",
                "layerAvailability": "AVAILABLE",
                "layerSize": 2777,
                "mediaType": "application/vnd.docker.container.image.v1+json"
            }
        ],
        "failures": []
    }

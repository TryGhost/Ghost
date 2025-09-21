**To update a service pipeline**

The following ``update-service-pipeline`` example updates a service pipeline to a new minor version of its service template. ::

    aws proton update-service-pipeline \
        --service-name "simple-svc" \
        --spec "file://service-spec.yaml" \
        --template-major-version "1" \
        --template-minor-version "1" \
        --deployment-type "MINOR_VERSION"

Output::

    {
        "pipeline": {
            "arn": "arn:aws:proton:region-id:123456789012:service/simple-svc/pipeline/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "createdAt": "2021-04-02T21:29:59.962000+00:00",
            "deploymentStatus": "IN_PROGRESS",
            "lastDeploymentAttemptedAt": "2021-04-02T21:39:28.991000+00:00",
            "lastDeploymentSucceededAt": "2021-04-02T21:29:59.962000+00:00",
            "spec": "proton: ServiceSpec\n\npipeline:\n  my_sample_pipeline_optional_input: \"abc\"\n  my_sample_pipeline_required_input: \"123\"\n\ninstances:\n  - name: \"my-instance\"\n    environment: \"MySimpleEnv\"\n    spec:\n      my_sample_service_instance_optional_input: \"def\"\n      my_sample_service_instance_required_input: \"456\"\n  - name: \"my-other-instance\"\n    environment: \"MySimpleEnv\"\n    spec:\n      my_sample_service_instance_required_input: \"789\"\n",
            "templateMajorVersion": "1",
            "templateMinorVersion": "0",
            "templateName": "svc-simple"
        }
    }

For more information, see `Update a service pipeline <https://docs.aws.amazon.com/proton/latest/adminguide/ag-svc-pipeline-update.html>`__ in the *The AWS Proton Administrator Guide* or `Update a service pipeline <https://docs.aws.amazon.com/proton/latest/userguide/ag-svc-pipeline-update.html>`__ in the *The AWS Proton User Guide*.

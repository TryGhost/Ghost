**To update a service instance to a new minor version**

The following ``update-service-instance`` example updates a service instance to a new minor version of its service template that adds a new instance named "my-other-instance" with a new required input. ::

    aws proton update-service-instance \
        --service-name "simple-svc" \
        --spec "file://service-spec.yaml " \
        --template-major-version "1" \
        --template-minor-version "1" \
        --deployment-type "MINOR_VERSION" \
        --name "instance-one"

Contents of ``service-spec.yaml``::

    proton: ServiceSpec
    pipeline:
        my_sample_pipeline_optional_input: "abc"
        my_sample_pipeline_required_input: "123"
    instances:
        - name: "instance-one"
            environment: "simple-env"
            spec:
                my_sample_service_instance_optional_input: "def"
                my_sample_service_instance_required_input: "456"
        - name: "my-other-instance"
            environment: "simple-env"
            spec:
                my_sample_service_instance_required_input: "789"

Output::

    {
        "serviceInstance": {
            "arn": "arn:aws:proton:region-id:123456789012:service/simple-svc/service-instance/instance-one",
            "createdAt": "2021-04-02T21:29:59.962000+00:00",
            "deploymentStatus": "IN_PROGRESS",
            "environmentName": "arn:aws:proton:region-id:123456789012:environment/simple-env",
            "lastDeploymentAttemptedAt": "2021-04-02T21:38:00.823000+00:00",
            "lastDeploymentSucceededAt": "2021-04-02T21:29:59.962000+00:00",
            "name": "instance-one",
            "serviceName": "simple-svc",
            "templateMajorVersion": "1",
            "templateMinorVersion": "0",
            "templateName": "svc-simple"
        }
    }

For more information, see `Update a service instance <https://docs.aws.amazon.com/proton/latest/adminguide/ag-svc-instance-update.html>`__ in the *The AWS Proton Administrator Guide* or `Update a service instance <https://docs.aws.amazon.com/proton/latest/userguide/ag-svc-instance-update.html>`__ in the *The AWS Proton User Guide*.
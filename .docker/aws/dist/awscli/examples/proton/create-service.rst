**To create a service**

The following ``create-service`` example creates a service with a service pipeline. ::

    aws proton create-service \
        --name "MySimpleService" \
        --template-name "fargate-service" \
        --template-major-version "1" \
        --branch-name "mainline" \
        --repository-connection-arn "arn:aws:codestar-connections:region-id:account-id:connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111" \
        --repository-id "myorg/myapp" \
        --spec file://spec.yaml

Contents of ``spec.yaml``::

    proton: ServiceSpec

    pipeline:
        my_sample_pipeline_required_input: "hello"
        my_sample_pipeline_optional_input: "bye"

    instances:
        - name: "acme-network-dev"
            environment: "ENV_NAME"
            spec:
                my_sample_service_instance_required_input: "hi"
                my_sample_service_instance_optional_input: "ho"

Output::

    {
        "service": {
            "arn": "arn:aws:proton:region-id:123456789012:service/MySimpleService",
            "createdAt": "2020-11-18T19:50:27.460000+00:00",
            "lastModifiedAt": "2020-11-18T19:50:27.460000+00:00",
            "name": "MySimpleService",
            "repositoryConnectionArn": "arn:aws:codestar-connections:region-id:123456789012connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "repositoryId": "myorg/myapp",
            "status": "CREATE_IN_PROGRESS",
            "templateName": "fargate-service"
        }
    }

For more information, see `Create a service <https://docs.aws.amazon.com/proton/latest/adminguide/ag-create-svc.html>`__ in the *The AWS Proton Administrator Guide* and `Create a service <https://docs.aws.amazon.com/proton/latest/userguide/ug-svc-create.html>`__ in the *The AWS Proton User Guide*.
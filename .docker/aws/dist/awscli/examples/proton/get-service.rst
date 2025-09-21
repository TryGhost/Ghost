**To get service details**

The following ``get-service`` example gets detail data for a service. ::

    aws proton get-service \
        --name "simple-svc"

Output::

    {
        "service": {
            "arn": "arn:aws:proton:region-id:123456789012:service/simple-svc",
            "branchName": "mainline",
            "createdAt": "2020-11-28T22:40:50.512000+00:00",
            "lastModifiedAt": "2020-11-28T22:44:51.207000+00:00",
            "name": "simple-svc",
            "pipeline": {
                "arn": "arn:aws:proton:region-id:123456789012:service/simple-svc/pipeline/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "createdAt": "2020-11-28T22:40:50.512000+00:00",
                "deploymentStatus": "SUCCEEDED",
                "lastDeploymentAttemptedAt": "2020-11-28T22:40:50.512000+00:00",
                "lastDeploymentSucceededAt": "2020-11-28T22:40:50.512000+00:00",
                "spec": "proton: ServiceSpec\npipeline:\n  my_sample_pipeline_required_input: hello\n  my_sample_pipeline_optional_input: bye\ninstances:\n- name: instance-svc-simple\n  environment: my-simple-env\n  spec:\n    my_sample_service_instance_required_input: hi\n    my_sample_service_instance_optional_input: ho\n",
                "templateMajorVersion": "1",
                "templateMinorVersion": "1",
                "templateName": "svc-simple"
            },
            "repositoryConnectionArn": "arn:aws:codestar-connections:region-id:123456789012:connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "repositoryId": "myorg/myapp",
            "spec": "proton: ServiceSpec\npipeline:\n  my_sample_pipeline_required_input: hello\n  my_sample_pipeline_optional_input: bye\ninstances:\n- name: instance-svc-simple\n  environment: my-simple-env\n  spec:\n    my_sample_service_instance_required_input: hi\n    my_sample_service_instance_optional_input: ho\n",
            "status": "ACTIVE",
            "templateName": "svc-simple"
        }
    }

For more information, see `View service data <https://docs.aws.amazon.com/proton/latest/adminguide/ag-svc-view.html>`__ in the *The AWS Proton Administrator Guide* or `View service data <https://docs.aws.amazon.com/proton/latest/userguide/ug-svc-view.html>`__ in the *The AWS Proton User Guide*.
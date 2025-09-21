**Example 1: To list all service instances**

The following ``list-service-instances`` example lists service instances. ::

    aws proton list-service-instances

Output::

    {
        "serviceInstances": [
            {
                "arn": "arn:aws:proton:region-id:123456789012:service/simple-svc/service-instance/instance-one",
                "createdAt": "2020-11-28T22:40:50.512000+00:00",
                "deploymentStatus": "SUCCEEDED",
                "environmentArn": "arn:aws:proton:region-id:123456789012:environment/simple-env",
                "lastDeploymentAttemptedAt": "2020-11-28T22:40:50.512000+00:00",
                "lastDeploymentSucceededAt": "2020-11-28T22:40:50.512000+00:00",
                "name": "instance-one",
                "serviceName": "simple-svc",
                "templateMajorVersion": "1",
                "templateMinorVersion": "0",
                "templateName": "fargate-service"
            }
        ]
    }

For more information, see `View service instance data <https://docs.aws.amazon.com/proton/latest/adminguide/ag-svc-instance-view.html>`__ in the *The AWS Proton Administrator Guide* or `View service instance data <https://docs.aws.amazon.com/proton/latest/userguide/ag-svc-instance-view.html>`__ in the *The AWS Proton User Guide*.

**Example 2: To list the specified service instance**

The following ``get-service-instance`` example gets a service instance. ::

    aws proton get-service-instance \
        --name "instance-one" \
        --service-name "simple-svc"

Output::

    {
        "serviceInstance": {
            "arn": "arn:aws:proton:region-id:123456789012:service/simple-svc/service-instance/instance-one",
            "createdAt": "2020-11-28T22:40:50.512000+00:00",
            "deploymentStatus": "SUCCEEDED",
            "environmentName": "simple-env",
            "lastDeploymentAttemptedAt": "2020-11-28T22:40:50.512000+00:00",
            "lastDeploymentSucceededAt": "2020-11-28T22:40:50.512000+00:00",
            "name": "instance-one",
            "serviceName": "simple-svc",
            "spec": "proton: ServiceSpec\npipeline:\n  my_sample_pipeline_optional_input: hello world\n  my_sample_pipeline_required_input: pipeline up\ninstances:\n- name: instance-one\n  environment: my-simple-env\n  spec:\n    my_sample_service_instance_optional_input: Ola\n    my_sample_service_instance_required_input: Ciao\n",
            "templateMajorVersion": "1",
            "templateMinorVersion": "0",
            "templateName": "svc-simple"
        }
    }

For more information, see `View service instance data <https://docs.aws.amazon.com/proton/latest/adminguide/ag-svc-instance-view.html>`__ in the *The AWS Proton Administrator Guide* or `View service instance data <https://docs.aws.amazon.com/proton/latest/userguide/ag-svc-instance-view.html>`__ in the *The AWS Proton User Guide*.

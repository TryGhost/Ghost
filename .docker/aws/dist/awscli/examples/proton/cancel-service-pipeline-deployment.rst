**To cancel a service pipeline deployment**

The following ``cancel-service-pipeline-deployment`` example cancels a service pipeline deployment. ::

    aws proton cancel-service-pipeline-deployment \
        --service-name "simple-svc"

Output::

    {
        "pipeline": {
            "arn": "arn:aws:proton:region-id:123456789012:service/simple-svc/pipeline",
            "createdAt": "2021-04-02T21:29:59.962000+00:00",
            "deploymentStatus": "CANCELLING",
            "lastDeploymentAttemptedAt": "2021-04-02T22:02:45.095000+00:00",
            "lastDeploymentSucceededAt": "2021-04-02T21:39:28.991000+00:00",
            "templateMajorVersion": "1",
            "templateMinorVersion": "1",
            "templateName": "svc-simple"
        }
    }

For more information, see `Update a service pipeline <https://docs.aws.amazon.com/proton/latest/adminguide/ag-svc-pipeline-update.html>`__ in the *The AWS Proton Administrator Guide* or `Update a service pipeline <https://docs.aws.amazon.com/proton/latest/userguide/ag-svc-pipeline-update.html>`__ in the *The AWS Proton User Guide*.
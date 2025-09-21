**To delete a service**

The following ``delete-service`` example deletes a service. ::

    aws proton delete-service \
        --name "simple-svc"

Output::

    {
        "service": {
            "arn": "arn:aws:proton:region-id:123456789012:service/simple-svc",
            "branchName": "mainline",
            "createdAt": "2020-11-28T22:40:50.512000+00:00",
            "description": "Edit by updating description",
            "lastModifiedAt": "2020-11-29T00:30:39.248000+00:00",
            "name": "simple-svc",
            "repositoryConnectionArn": "arn:aws:codestar-connections:region-id:123456789012:connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "repositoryId": "myorg/myapp",
            "status": "DELETE_IN_PROGRESS",
            "templateName": "fargate-service"
        }
    }

For more information, see `Delete a service <https://docs.aws.amazon.com/proton/latest/adminguide/ag-svc-delete.html>`__ in the *The AWS Proton Administrator Guide*.
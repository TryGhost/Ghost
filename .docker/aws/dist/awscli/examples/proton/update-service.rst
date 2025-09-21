**To update a service**

The following ``update-service`` example edits a service description. ::

    aws proton update-service \
        --name "MySimpleService" \
        --description "Edit by updating description"

Output::

    {
        "service": {
            "arn": "arn:aws:proton:region-id:123456789012:service/MySimpleService",
            "branchName": "mainline",
            "createdAt": "2021-03-12T22:39:42.318000+00:00",
            "description": "Edit by updating description",
            "lastModifiedAt": "2021-03-12T22:44:21.975000+00:00",
            "name": "MySimpleService",
            "repositoryConnectionArn": "arn:aws:codestar-connections:region-id:123456789012:connection/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "repositoryId": "myorg/myapp",
            "status": "ACTIVE",
            "templateName": "fargate-service"
        }
    }

For more information, see `Edit a service <https://docs.aws.amazon.com/proton/latest/adminguide/ag-svc-update.html>`__ in the *The AWS Proton Administrator Guide* or `Edit a service <https://docs.aws.amazon.com/proton/latest/userguide/ug-svc-update.html>`__ in the *The AWS Proton User Guide*.
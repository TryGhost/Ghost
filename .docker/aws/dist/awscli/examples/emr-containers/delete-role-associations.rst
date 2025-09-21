**To delete role associations of an IAM Role with EMR service accounts**

EKS allows associations with non existing resources (namespace, service account), so EMR on EKS suggest to delete the associations if the namespace is deleted or the role is not in use to release the space for other associations.

The following ``delete-role-associations`` example command deletes EKS pod identity associations of a role named **example_iam_role** with EMR service accounts such that it can be removed from Amazon EMR on EKS with
**example_namespace** namespace from an EKS cluster named **example_cluster**.::

    aws emr-containers delete-role-associations \
        --cluster-name example_cluster \
        --namespace example_namespace \
        --role-name example_iam_role

Output::

    [
        {
            "clusterName": "example_cluster",
            "namespace": "example_namespace",
            "serviceAccount": "emr-spark-client-service-account-example",
            "roleArn": "arn:aws:iam::111111111111:role/example_iam_role",
            "associationArn": "arn:aws:eks:us-east-1:111111111111:podidentityassociation/example_cluster/a-bgyr1umgdmrk1kdtq",
            "associationId": "a-bgyr1umgdmrk1kdtq",
            "tags": {},
            "createdAt": "2022-11-15T10:49:00+00:00",
            "modifiedAt": "2022-11-15T10:49:00+00:00"
        },
        {
            "clusterName": "example_cluster",
            "namespace": "example_namespace",
            "serviceAccount": "emr-spark-driver-service-account-example",
            "roleArn": "arn:aws:iam::111111111111:role/example_iam_role",
            "associationArn": "arn:aws:eks:us-east-1:111111111111:podidentityassociation/example_cluster/b-bgyr1umgdmrk1kdtq",
            "associationId": "b-bgyr1umgdmrk1kdtq",
            "tags": {},
            "createdAt": "2022-11-15T10:49:00+00:00",
            "modifiedAt": "2022-11-15T10:49:00+00:00"
        },
        {
            "clusterName": "example_cluster",
            "namespace": "example_namespace",
            "serviceAccount": "emr-spark-executor-service-account-example",
            "roleArn": "arn:aws:iam::111111111111:role/example_iam_role",
            "associationArn": "arn:aws:eks:us-east-1:111111111111:podidentityassociation/example_cluster/c-bgyr1umgdmrk1kdtq",
            "associationId": "c-bgyr1umgdmrk1kdtq",
            "tags": {},
            "createdAt": "2022-11-15T10:49:00+00:00",
            "modifiedAt": "2022-11-15T10:49:00+00:00"
        }
    ]   


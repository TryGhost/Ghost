**To update the trust policy of an IAM Role to be used with Amazon EMR on EKS**

This example command updates the trust policy of a role named **example_iam_role** such that it can be used with Amazon EMR on EKS with
**example_namespace** namespace from an EKS cluster named **example_cluster**.

* Command::

    aws emr-containers update-role-trust-policy \
        --cluster example_cluster \
        --namespace example_namespace \
        --role-name example_iam_role

* Output::

    If the trust policy has already been updated, then the output will be:
    Trust policy statement already exists for role example_iam_role. No
    changes were made!

    If the trust policy has not been updated yet, then the output will be:
    Successfully updated trust policy of role example_iam_role.

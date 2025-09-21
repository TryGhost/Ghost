Updates the trust policy of given IAM role such that it can be used with Amazon EMR on EKS with the given namespace from the given EKS cluster.

Note:
 To use the IAM Role with Amazon EMR on EKS, OIDC identity provider also needs to be created for the EKS cluster.
 This can be done using ``eksctl utils associate-iam-oidc-provider --cluster <cluster_name> --approve`` command.
 For information about installing or upgrading eksctl, see `Installing or upgrading eksctl <https://docs.aws.amazon.com/eks/latest/userguide/eksctl.html#installing-eksctl>`__ in the *Amazon EKS User Guide*.

The command would merge the existing trust policy of the role with the below trust policy::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/<OIDC_PROVIDER>"
                },
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    "StringLike": {
                        "<OIDC_PROVIDER>:sub": "system:serviceaccount:<NAMESPACE>:emr-containers-sa-*-*-<AWS_ACCOUNT_ID>-<BASE36_ENCODED_ROLE_NAME>"
                    }
                }
            }
        ]
    }

Here::

    <AWS_ACCOUNT_ID> = AWS Account ID of the EKS cluster
    <OIDC_PROVIDER> = OIDC Identity Provider for the EKS cluster
    <NAMESPACE> = Namespace of the EKS cluster
    <BASE36_ENCODED_ROLE_NAME> = Base36 encoded form of the IAM Role name

You can use the **--dry-run** option to print the merged trust policy document to stdout instead of updating the role trust policy directly.

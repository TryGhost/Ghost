**Example 1: To list the Pod Identity associations in an EKS cluster**

The following ``list-pod-identity-associations`` returns the list of Pod Identity associations associated with the EKS cluster named ``eks-customer`` in all namespaces and service accounts. ::

    aws eks list-pod-identity-associations \
        --cluster-name eks-customer

Output::

    {
        "associations": [
            {
                "clusterName": "eks-customer",
                "namespace": "default",
                "serviceAccount": "default",
                "associationArn": "arn:aws:eks:us-west-2:111122223333:podidentityassociation/eks-customer/a-9njjin9gfghecgocd",
                "associationId": "a-9njjin9gfghecgocd"
            },
            {
                "clusterName": "eks-customer",
                "namespace": "kube-system",
                "serviceAccount": "eks-customer",
                "associationArn": "arn:aws:eks:us-west-2:111122223333:podidentityassociation/eks-customer/a-dvtacahdvjn01ffbc",
                "associationId": "a-dvtacahdvjn01ffbc"
            },
            {
                "clusterName": "eks-customer",
                "namespace": "kube-system",
                "serviceAccount": "coredns",
                "associationArn": "arn:aws:eks:us-west-2:111122223333:podidentityassociation/eks-customer/a-yrpsdroc4ei7k6xps",
                "associationId": "a-yrpsdroc4ei7k6xps"
            }
        ]
    }

For more information, see `Learn how EKS Pod Identity grants pods access to AWS services <https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html>`__ in the *Amazon EKS User Guide*.

**Example 2: To list the Pod Identity associations in an EKS cluster based on namespace and service account**

The following ``list-pod-identity-associations`` returns the list of Pod Identity associations in the EKS cluster based on namespace and service account. ::

    aws eks list-pod-identity-associations \
        --cluster-name eks-customer \
        --namespace kube-system \
        --service-account eks-customer

Output::

    {
        "associations": [
            {
                "clusterName": "eks-customer",
                "namespace": "kube-system",
                "serviceAccount": "eks-customer",
                "associationArn": "arn:aws:eks:us-west-2:111122223333:podidentityassociation/eks-customer/a-dvtacahdvjn01ffbc",
                "associationId": "a-dvtacahdvjn01ffbc"
            }
        ]
    }

For more information, see `Learn how EKS Pod Identity grants pods access to AWS services <https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html>`__ in the *Amazon EKS User Guide*.
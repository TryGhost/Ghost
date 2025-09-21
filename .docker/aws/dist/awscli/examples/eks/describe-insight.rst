**To get the details of an insight for an EKS cluster using its ID**

The following ``describe-insight`` example returns the details about the insight specified using the cluster name and insight ID. ::

    aws eks describe-insight \
        --cluster-name eks-customer \
        --id 38ea7a64-a14f-4e0e-95c7-8dbcab3c3623

Output::

    {
        "insight": {
            "id": "38ea7a64-a14f-4e0e-95c7-8dbcab3c3623",
            "name": "Kubelet version skew",
            "category": "UPGRADE_READINESS",
            "kubernetesVersion": "1.33",
            "lastRefreshTime": "2025-05-24T11:22:50-05:00",
            "lastTransitionTime": "2025-05-24T11:22:50-05:00",
            "description": "Checks for kubelet versions of worker nodes in the cluster to see if upgrade would cause noncompliance with supported Kubernetes kubelet version skew policy.",
            "insightStatus": {
                "status": "PASSING",
                "reason": "Node kubelet versions match the cluster control plane version."
            },
            "recommendation": "Upgrade your worker nodes to match the Kubernetes version of your cluster control plane.",
            "additionalInfo": {
                "Kubelet version skew policy": "https://kubernetes.io/releases/version-skew-policy/#kubelet",
                "Updating a managed node group": "https://docs.aws.amazon.com/eks/latest/userguide/update-managed-node-group.html"
            },
            "resources": [],
            "categorySpecificSummary": {
                "deprecationDetails": []
            }
        }
    }

For more information, see `View cluster insights <https://docs.aws.amazon.com/eks/latest/userguide/view-cluster-insights.html>`__ in the *Amazon EKS User Guide*.
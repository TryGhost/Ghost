**To list all insights for the specified cluster**

The following ``list-insights`` example returns the list of all insights checked against the specified cluster. ::

    aws eks list-insights \
    --cluster-name eks-customer

Output::

    {
        "insights": [
            {
                "id": "38ea7a64-a14f-4e0e-95c7-8dbcab3c3616",
                "name": "Kubelet version skew",
                "category": "UPGRADE_READINESS",
                "kubernetesVersion": "1.33",
                "lastRefreshTime": "2025-05-24T11:22:50-05:00",
                "lastTransitionTime": "2025-05-24T11:22:50-05:00",
                "description": "Checks for kubelet versions of worker nodes in the cluster to see if upgrade would cause noncompliance with supported Kubernetes kubelet version skew policy.",
                "insightStatus": {
                    "status": "PASSING",
                    "reason": "Node kubelet versions match the cluster control plane version."
                }
            },
            {
                "id": "9cd91472-f99c-45a9-b7d7-54d4900dee23",
                "name": "EKS add-on version compatibility",
                "category": "UPGRADE_READINESS",
                "kubernetesVersion": "1.33",
                "lastRefreshTime": "2025-05-24T11:22:59-05:00",
                "lastTransitionTime": "2025-05-24T11:22:50-05:00",
                "description": "Checks version of installed EKS add-ons to ensure they are compatible with the next version of Kubernetes. ",
                "insightStatus": {
                    "status": "PASSING",
                    "reason": "All installed EKS add-on versions are compatible with next Kubernetes version."
                }
            },
            {
                "id": "0deb269d-b1e1-458c-a2b4-7a57f940c875",
                "name": "Cluster health issues",
                "category": "UPGRADE_READINESS",
                "kubernetesVersion": "1.33",
                "lastRefreshTime": "2025-05-24T11:22:59-05:00",
                "lastTransitionTime": "2025-05-24T11:22:50-05:00",
                "description": "Checks for any cluster health issues that prevent successful upgrade to the next Kubernetes version on EKS.",
                "insightStatus": {
                    "status": "PASSING",
                    "reason": "No cluster health issues detected."
                }
            },
            {
                "id": "214fa274-344f-420b-812a-5049ce72c9ww",
                "name": "kube-proxy version skew",
                "category": "UPGRADE_READINESS",
                "kubernetesVersion": "1.33",
                "lastRefreshTime": "2025-05-24T11:22:50-05:00",
                "lastTransitionTime": "2025-05-24T11:22:50-05:00",
                "description": "Checks version of kube-proxy in cluster to see if upgrade would cause noncompliance with supported Kubernetes kube-proxy version skew policy.",
                "insightStatus": {
                    "status": "PASSING",
                    "reason": "kube-proxy versions match the cluster control plane version."
                }
            }
        ]
    }

For more information, see `View cluster insights <https://docs.aws.amazon.com/eks/latest/userguide/view-cluster-insights.html>`__ in the *Amazon EKS User Guide*.
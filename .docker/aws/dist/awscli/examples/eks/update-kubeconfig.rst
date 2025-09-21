**Example 1: Configures your kubectl by creating or updating the kubeconfig so that you can connect to an Amazon EKS Cluster named `my-eks-cluster`**

The following ``update-kubeconfig`` example configures your kubectl by creating or updating the kubeconfig so that you can connect to an Amazon EKS Cluster named `my-eks-cluster`. ::

    aws eks update-kubeconfig \
        --name my-eks-cluster

Output::

    Updated context arn:aws:eks:us-east-2:111122223333:cluster/my-eks-cluster in /Users/xxx/.kube/config

For more information, see `Creating or updating a kubeconfig file for an Amazon EKS cluster <https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html>`__ in the *Amazon EKS User Guide*.

**Example 2: Configures your kubectl by creating or updating the kubeconfig (with role-arn option to assume a role for cluster authentication) so that you can connect to an Amazon EKS Cluster named `my-eks-cluster`**

The following ``update-kubeconfig`` example configures your kubectl by creating or updating the kubeconfig (with role-arn option to assume a role for cluster authentication) so that you can connect to an Amazon EKS Cluster named `my-eks-cluster`. ::

    aws eks update-kubeconfig \
        --name my-eks-cluster \
        --role-arn arn:aws:iam::111122223333:role/eksctl-EKS-Linux-Cluster-v1-24-cluster-ServiceRole-j1k7AfTIQtnM

Output::

    Updated context arn:aws:eks:us-east-2:111122223333:cluster/my-eks-cluster in /Users/xxx/.kube/config

For more information, see `Creating or updating a kubeconfig file for an Amazon EKS cluster <https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html>`__ in the *Amazon EKS User Guide*.

**Example 3: Configures your kubectl by creating or updating the kubeconfig (with role-arn option to assume a role for cluster authentication along with custom cluster alias and user-alias) so that you can connect to an Amazon EKS Cluster named `my-eks-cluster`**

The following ``update-kubeconfig`` example configures your kubectl by creating or updating the kubeconfig (with role-arn option to assume a role for cluster authentication along with custom cluster alias and user-alias) so that you can connect to an Amazon EKS Cluster named `my-eks-cluster`. ::

    aws eks update-kubeconfig \
        --name my-eks-cluster \
        --role-arn arn:aws:iam::111122223333:role/eksctl-EKS-Linux-Cluster-v1-24-cluster-ServiceRole-j1k7AfTIQtnM \
        --alias stage-eks-cluster \
        --user-alias john

Output::

    Updated context stage-eks-cluster in /Users/dubaria/.kube/config

For more information, see `Creating or updating a kubeconfig file for an Amazon EKS cluster <https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html>`__ in the *Amazon EKS User Guide*.

**Example 4: Print kubeconfig file entries for review and configures your kubectl so that you can connect to an Amazon EKS Cluster named `my-eks-cluster`**

The following ``update-kubeconfig`` example configures your kubectl by creating or updating the kubeconfig (with role-arn option to assume a role for cluster authentication along with custom cluster alias and user-alias) so that you can connect to an Amazon EKS Cluster named `my-eks-cluster`. ::

    aws eks update-kubeconfig \
        --name my-eks-cluster \
        --role-arn arn:aws:iam::111122223333:role/eksctl-EKS-Linux-Cluster-v1-24-cluster-ServiceRole-j1k7AfTIQtnM \
        --alias stage-eks-cluster \
        --user-alias john \
        --verbose

Output::

    Updated context stage-eks-cluster in /Users/dubaria/.kube/config
    Entries:

    context:
    cluster: arn:aws:eks:us-east-2:111122223333:cluster/my-eks-cluster
    user: john
    name: stage-eks-cluster

    name: john
    user:
    exec:
        apiVersion: client.authentication.k8s.io/v1beta1
        args:
        - --region
        - us-east-2
        - eks
        - get-token
        - --cluster-name
        - my-eks-cluster
        - --output
        - json
        - --role
        - arn:aws:iam::111122223333:role/eksctl-EKS-Linux-Cluster-v1-24-cluster-ServiceRole-j1k7AfTIQtnM
        command: aws

    cluster:
    certificate-authority-data: xxx_CA_DATA_xxx
    server: https://DALSJ343KE23J3RN45653DSKJTT647TYD.yl4.us-east-2.eks.amazonaws.com
    name: arn:aws:eks:us-east-2:111122223333:cluster/my-eks-cluster

For more information, see `Creating or updating a kubeconfig file for an Amazon EKS cluster <https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html>`__ in the *Amazon EKS User Guide*.

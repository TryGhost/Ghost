**Example 1: List all the available addons for EKS Cluster**

The following ``describe-addon-versions`` example list all the available AWS addons. ::

    aws eks describe-addon-versions  \
        --query 'sort_by(addons  &owner)[].{publisher: publisher, owner: owner, addonName: addonName, type: type}' \
        --output table

Output::

    --------------------------------------------------------------------------------------------------------------------
    |                                               DescribeAddonVersions                                              |
    +---------------------------------------------+------------------+-----------------------+-------------------------+
    |                  addonName                  |      owner       |       publisher       |          type           |
    +---------------------------------------------+------------------+-----------------------+-------------------------+
    |  vpc-cni                                    |  aws             |  eks                  |  networking             |
    |  snapshot-controller                        |  aws             |  eks                  |  storage                |
    |  kube-proxy                                 |  aws             |  eks                  |  networking             |
    |  eks-pod-identity-agent                     |  aws             |  eks                  |  security               |
    |  coredns                                    |  aws             |  eks                  |  networking             |
    |  aws-mountpoint-s3-csi-driver               |  aws             |  s3                   |  storage                |
    |  aws-guardduty-agent                        |  aws             |  eks                  |  security               |
    |  aws-efs-csi-driver                         |  aws             |  eks                  |  storage                |
    |  aws-ebs-csi-driver                         |  aws             |  eks                  |  storage                |
    |  amazon-cloudwatch-observability            |  aws             |  eks                  |  observability          |
    |  adot                                       |  aws             |  eks                  |  observability          |
    |  upwind-security_upwind-operator            |  aws-marketplace |  Upwind Security      |  security               |
    |  upbound_universal-crossplane               |  aws-marketplace |  upbound              |  infra-management       |
    |  tetrate-io_istio-distro                    |  aws-marketplace |  tetrate-io           |  policy-management      |
    |  teleport_teleport                          |  aws-marketplace |  teleport             |  policy-management      |
    |  stormforge_optimize-live                   |  aws-marketplace |  StormForge           |  cost-management        |
    |  splunk_splunk-otel-collector-chart         |  aws-marketplace |  Splunk               |  monitoring             |
    |  solo-io_istio-distro                       |  aws-marketplace |  Solo.io              |  service-mesh           |
    |  rafay-systems_rafay-operator               |  aws-marketplace |  rafay-systems        |  kubernetes-management  |
    |  new-relic_kubernetes-operator              |  aws-marketplace |  New Relic            |  observability          |
    |  netapp_trident-operator                    |  aws-marketplace |  NetApp Inc.          |  storage                |
    |  leaksignal_leakagent                       |  aws-marketplace |  leaksignal           |  monitoring             |
    |  kubecost_kubecost                          |  aws-marketplace |  kubecost             |  cost-management        |
    |  kong_konnect-ri                            |  aws-marketplace |  kong                 |  ingress-service-type   |
    |  kasten_k10                                 |  aws-marketplace |  Kasten by Veeam      |  data-protection        |
    |  haproxy-technologies_kubernetes-ingress-ee |  aws-marketplace |  HAProxy Technologies |  ingress-controller     |
    |  groundcover_agent                          |  aws-marketplace |  groundcover          |  monitoring             |
    |  grafana-labs_kubernetes-monitoring         |  aws-marketplace |  Grafana Labs         |  monitoring             |
    |  factorhouse_kpow                           |  aws-marketplace |  factorhouse          |  monitoring             |
    |  dynatrace_dynatrace-operator               |  aws-marketplace |  dynatrace            |  monitoring             |
    |  datree_engine-pro                          |  aws-marketplace |  datree               |  policy-management      |
    |  datadog_operator                           |  aws-marketplace |  Datadog              |  monitoring             |
    |  cribl_cribledge                            |  aws-marketplace |  Cribl                |  observability          |
    |  calyptia_fluent-bit                        |  aws-marketplace |  Calyptia Inc         |  observability          |
    |  accuknox_kubearmor                         |  aws-marketplace |  AccuKnox             |  security               |
    +---------------------------------------------+------------------+-----------------------+-------------------------+

For more information, see `Managing Amazon EKS add-ons - Creating an add-on <https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html#creating-an-add-on>`__ in the *Amazon EKS User Guide*.

**Example 2: List all the available addons for specified Kubernetes version suppoerted for EKS**

The following ``describe-addon-versions`` example list all the available addons for specified Kubernetes version suppoerted for EKS. ::

    aws eks describe-addon-versions  \
        --kubernetes-version=1.26 \
        --query 'sort_by(addons  &owner)[].{publisher: publisher, owner: owner, addonName: addonName, type: type}' \
        --output table 

Output::

    --------------------------------------------------------------------------------------------------------------------
    |                                               DescribeAddonVersions                                              |
    +---------------------------------------------+------------------+-----------------------+-------------------------+
    |                  addonName                  |      owner       |       publisher       |          type           |
    +---------------------------------------------+------------------+-----------------------+-------------------------+
    |  vpc-cni                                    |  aws             |  eks                  |  networking             |
    |  snapshot-controller                        |  aws             |  eks                  |  storage                |
    |  kube-proxy                                 |  aws             |  eks                  |  networking             |
    |  eks-pod-identity-agent                     |  aws             |  eks                  |  security               |
    |  coredns                                    |  aws             |  eks                  |  networking             |
    |  aws-mountpoint-s3-csi-driver               |  aws             |  s3                   |  storage                |
    |  aws-guardduty-agent                        |  aws             |  eks                  |  security               |
    |  aws-efs-csi-driver                         |  aws             |  eks                  |  storage                |
    |  aws-ebs-csi-driver                         |  aws             |  eks                  |  storage                |
    |  amazon-cloudwatch-observability            |  aws             |  eks                  |  observability          |
    |  adot                                       |  aws             |  eks                  |  observability          |
    |  upwind-security_upwind-operator            |  aws-marketplace |  Upwind Security      |  security               |
    |  tetrate-io_istio-distro                    |  aws-marketplace |  tetrate-io           |  policy-management      |
    |  stormforge_optimize-live                   |  aws-marketplace |  StormForge           |  cost-management        |
    |  splunk_splunk-otel-collector-chart         |  aws-marketplace |  Splunk               |  monitoring             |
    |  solo-io_istio-distro                       |  aws-marketplace |  Solo.io              |  service-mesh           |
    |  rafay-systems_rafay-operator               |  aws-marketplace |  rafay-systems        |  kubernetes-management  |
    |  new-relic_kubernetes-operator              |  aws-marketplace |  New Relic            |  observability          |
    |  netapp_trident-operator                    |  aws-marketplace |  NetApp Inc.          |  storage                |
    |  leaksignal_leakagent                       |  aws-marketplace |  leaksignal           |  monitoring             |
    |  kubecost_kubecost                          |  aws-marketplace |  kubecost             |  cost-management        |
    |  kong_konnect-ri                            |  aws-marketplace |  kong                 |  ingress-service-type   |
    |  haproxy-technologies_kubernetes-ingress-ee |  aws-marketplace |  HAProxy Technologies |  ingress-controller     |
    |  groundcover_agent                          |  aws-marketplace |  groundcover          |  monitoring             |
    |  grafana-labs_kubernetes-monitoring         |  aws-marketplace |  Grafana Labs         |  monitoring             |
    |  dynatrace_dynatrace-operator               |  aws-marketplace |  dynatrace            |  monitoring             |
    |  datadog_operator                           |  aws-marketplace |  Datadog              |  monitoring             |
    |  cribl_cribledge                            |  aws-marketplace |  Cribl                |  observability          |
    |  calyptia_fluent-bit                        |  aws-marketplace |  Calyptia Inc         |  observability          |
    |  accuknox_kubearmor                         |  aws-marketplace |  AccuKnox             |  security               |
    +---------------------------------------------+------------------+-----------------------+-------------------------+

For more information, see `Managing Amazon EKS add-ons - Creating an add-on <https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html#creating-an-add-on>`__ in the *Amazon EKS User Guide*.

**Example 3: List all the available vpc-cni addons version for specified Kubernetes version suppoerted for EKS**

The following ``describe-addon-versions`` example list all the available vpc-cni addons version for specified Kubernetes version suppoerted for EKS. ::

    aws eks describe-addon-versions \
        --kubernetes-version=1.26 \
        --addon-name=vpc-cni \
        --query='addons[].addonVersions[].addonVersion'

Output::

    [
        "v1.18.0-eksbuild.1",
        "v1.17.1-eksbuild.1",
        "v1.16.4-eksbuild.2",
        "v1.16.3-eksbuild.2",
        "v1.16.2-eksbuild.1",
        "v1.16.0-eksbuild.1",
        "v1.15.5-eksbuild.1",
        "v1.15.4-eksbuild.1",
        "v1.15.3-eksbuild.1",
        "v1.15.1-eksbuild.1",
        "v1.15.0-eksbuild.2",
        "v1.14.1-eksbuild.1",
        "v1.14.0-eksbuild.3",
        "v1.13.4-eksbuild.1",
        "v1.13.3-eksbuild.1",
        "v1.13.2-eksbuild.1",
        "v1.13.0-eksbuild.1",
        "v1.12.6-eksbuild.2",
        "v1.12.6-eksbuild.1",
        "v1.12.5-eksbuild.2",
        "v1.12.0-eksbuild.2"
    ]

For more information, see `Managing Amazon EKS add-ons - Creating an add-on <https://docs.aws.amazon.com/eks/latest/userguide/managing-add-ons.html#creating-an-add-on>`__ in the *Amazon EKS User Guide*.

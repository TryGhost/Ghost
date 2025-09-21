**To describe node configuration options**

The following ``describe-node-configuration-options`` example displays the properties of possible node configurations such as node type, number of nodes, and disk usage for the specified cluster snapshot. ::

    aws redshift describe-node-configuration-options \
        --action-type restore-cluster \
        --snapshot-identifier rs:mycluster-2019-12-09-16-42-43

Output::

    {
        "NodeConfigurationOptionList": [
            {
                "NodeType": "dc2.large",
                "NumberOfNodes": 2,
                "EstimatedDiskUtilizationPercent": 19.61
            },
            {
                "NodeType": "dc2.large",
                "NumberOfNodes": 4,
                "EstimatedDiskUtilizationPercent": 9.96
            },
            {
                "NodeType": "ds2.xlarge",
                "NumberOfNodes": 2,
                "EstimatedDiskUtilizationPercent": 1.53
            },
            {
                "NodeType": "ds2.xlarge",
                "NumberOfNodes": 4,
                "EstimatedDiskUtilizationPercent": 0.78
            }
        ]
    }

For more information, see `Purchasing Amazon Redshift Reserved Nodes <https://docs.aws.amazon.com/redshift/latest/mgmt/purchase-reserved-node-instance.html>`__ in the *Amazon Redshift Cluster Management Guide*.

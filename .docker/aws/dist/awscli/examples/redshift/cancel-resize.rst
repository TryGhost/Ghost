**To cancel resize of a cluster**

The following ``cancel-resize`` example cancels a classic resize operation for a cluster. ::

    aws redshift cancel-resize \
        --cluster-identifier mycluster

Output::

    {
        "TargetNodeType": "dc2.large",
        "TargetNumberOfNodes": 2,
        "TargetClusterType": "multi-node",
        "Status": "CANCELLING",
        "ResizeType": "ClassicResize",
        "TargetEncryptionType": "NONE"
    }

For more information, see `Resizing Clusters in Amazon Redshift <https://docs.aws.amazon.com/redshift/latest/mgmt/rs-resize-tutorial.html>`__ in the *Amazon Redshift Cluster Management Guide*.

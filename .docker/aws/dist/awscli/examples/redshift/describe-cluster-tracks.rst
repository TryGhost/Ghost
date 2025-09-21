**To describe cluster tracks**

The following ``describe-cluster-tracks`` example displays details of the available maintenance tracks. ::

    aws redshift describe-cluster-tracks \
        --maintenance-track-name current

Output::

    {
        "MaintenanceTracks": [
            {
                "MaintenanceTrackName": "current",
                "DatabaseVersion": "1.0.11420",
                "UpdateTargets": [
                    {
                        "MaintenanceTrackName": "preview_features",
                        "DatabaseVersion": "1.0.11746",
                        "SupportedOperations": [
                            {
                                "OperationName": "restore-from-cluster-snapshot"
                            }
                        ]
                    },
                    {
                        "MaintenanceTrackName": "trailing",
                        "DatabaseVersion": "1.0.11116",
                        "SupportedOperations": [
                            {
                                "OperationName": "restore-from-cluster-snapshot"
                            },
                            {
                                "OperationName": "modify-cluster"
                            }
                        ]
                    }
                ]
            }
        ]
    }

For more information, see `Choosing Cluster Maintenance Tracks <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html#rs-mgmt-maintenance-tracks>`__ in the *Amazon Redshift Cluster Management Guide*.

**To describe DB revisions for a cluster**

The following ``describe-cluster-db-revisions`` example displays the details of an array of ``ClusterDbRevision`` objects for the specified cluster. ::

    aws redshift describe-cluster-db-revisions \
        --cluster-identifier mycluster

Output::

    {
        "ClusterDbRevisions": [
            {
                "ClusterIdentifier": "mycluster",
                "CurrentDatabaseRevision": "11420",
                "DatabaseRevisionReleaseDate": "2019-11-22T16:43:49.597Z",
                "RevisionTargets": []
            }
        ]
    }

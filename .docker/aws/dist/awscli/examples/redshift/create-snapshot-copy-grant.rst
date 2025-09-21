**To create a snapshot copy grant**

The following ``create-snapshot-copy-grant`` example creates a snapshot copy grant and encrypts copied snapshots in a destination AWS Region. ::

    aws redshift create-snapshot-copy-grant \
        --snapshot-copy-grant-name mysnapshotcopygrantname

Output::

    {
        "SnapshotCopyGrant": {
            "SnapshotCopyGrantName": "mysnapshotcopygrantname",
            "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/bPxRfih3yCo8nvbEXAMPLEKEY",
            "Tags": []
        }
    }

For more information, see `Amazon Redshift Database Encryption <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-db-encryption.html>`__ in the *Amazon Redshift Cluster Management Guide*.

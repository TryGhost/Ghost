**To describe snapshot copy grants**

The following ``describe-snapshot-copy-grants`` example displays details for the specified cluster snapshot copy grant. ::

    aws redshift describe-snapshot-copy-grants \
        --snapshot-copy-grant-name mysnapshotcopygrantname

Output::

    {
        "SnapshotCopyGrants": [
            {
                "SnapshotCopyGrantName": "mysnapshotcopygrantname",
                "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/bPxRfih3yCo8nvbEXAMPLEKEY",
                "Tags": []
            }
        ]
    }

For more information, see `Amazon Redshift Database Encryption <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-db-encryption.html>`__ in the *Amazon Redshift Cluster Management Guide*.

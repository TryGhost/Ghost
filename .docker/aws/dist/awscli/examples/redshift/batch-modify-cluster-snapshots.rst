**To modify a set of cluster snapshots**

The following ``batch-modify-cluster-snapshots`` example modifies the settings for a set of cluster snapshots. ::

    aws redshift batch-modify-cluster-snapshots \
        --snapshot-identifier-list mycluster-2019-11-06-16-31 mycluster-2019-11-06-16-32 \
        --manual-snapshot-retention-period 30

Output::

    {
        "Resources": [
            "mycluster-2019-11-06-16-31",
            "mycluster-2019-11-06-16-32"
        ],
        "Errors": [],
        "ResponseMetadata": {
            "RequestId": "12345678-12ab-12a1-1a2a-12ab-12a12EXAMPLE",
            "HTTPStatusCode": 200,
            "HTTPHeaders": {
        	    "x-amzn-requestid": "12345678-12ab-12a1-1a2a-12ab-12a12EXAMPLE,
        	    "content-type": "text/xml",
        	    "content-length": "480",
    		    "date": "Sat, 07 Dec 2019 00:36:09 GMT",
    		    "connection": "keep-alive"
    	    },
    	    "RetryAttempts": 0
        }
    }

For more information, see `Amazon Redshift Snapshots <https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-snapshots.html>`__ in the *Amazon Redshift Cluster Management Guide*.

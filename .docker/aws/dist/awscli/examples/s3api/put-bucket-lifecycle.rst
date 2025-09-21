The following command applies a lifecycle configuration to the bucket ``amzn-s3-demo-bucket``::

  aws s3api put-bucket-lifecycle --bucket amzn-s3-demo-bucket --lifecycle-configuration file://lifecycle.json

The file ``lifecycle.json`` is a JSON document in the current folder that specifies two rules::

  {
    "Rules": [
      {
        "ID": "Move to Glacier after sixty days (objects in logs/2015/)",
        "Prefix": "logs/2015/",
        "Status": "Enabled",
        "Transition": {
          "Days": 60,
          "StorageClass": "GLACIER"
        }
      },
      {
        "Expiration": {
          "Date": "2016-01-01T00:00:00.000Z"
        },
        "ID": "Delete 2014 logs in 2016.",
        "Prefix": "logs/2014/",
        "Status": "Enabled"
      }
    ]
  }

The first rule moves files to Amazon Glacier after sixty days. The second rule deletes files from Amazon S3 on the specified date. For information on acceptable timestamp formats, see `Specifying Parameter Values`_ in the *AWS CLI User Guide*.

Each rule in the above example specifies a policy (``Transition`` or ``Expiration``) and file prefix (folder name) to which it applies. You can also create a rule that applies to an entire bucket by specifying a blank prefix::

  {
    "Rules": [
      {
        "ID": "Move to Glacier after sixty days (all objects in bucket)",
        "Prefix": "",
        "Status": "Enabled",
        "Transition": {
          "Days": 60,
          "StorageClass": "GLACIER"
        }
      }
    ]
  }

.. _`Specifying Parameter Values`: http://docs.aws.amazon.com/cli/latest/userguide/cli-using-param.html

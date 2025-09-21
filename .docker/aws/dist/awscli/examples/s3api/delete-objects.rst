The following command deletes an object from a bucket named ``amzn-s3-demo-bucket``::

  aws s3api delete-objects --bucket amzn-s3-demo-bucket --delete file://delete.json

``delete.json`` is a JSON document in the current directory that specifies the object to delete::

  {
    "Objects": [
      {
        "Key": "test1.txt"
      }
    ],
    "Quiet": false
  }

Output::

  {
      "Deleted": [
          {
              "DeleteMarkerVersionId": "mYAT5Mc6F7aeUL8SS7FAAqUPO1koHwzU",
              "Key": "test1.txt",
              "DeleteMarker": true
          }
      ]
  }
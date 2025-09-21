The following command retrieves the access control list for an object in a bucket named ``amzn-s3-demo-bucket``::

  aws s3api get-object-acl --bucket amzn-s3-demo-bucket --key index.html

Output::

  {
      "Owner": {
          "DisplayName": "my-username",
          "ID": "7009a8971cd538e11f6b6606438875e7c86c5b672f46db45460ddcd087d36c32"
      },
      "Grants": [
          {
              "Grantee": {
                  "DisplayName": "my-username",
                  "ID": "7009a8971cd538e11f6b6606438875e7c86c5b672f46db45460ddcd087d36c32"
              },
              "Permission": "FULL_CONTROL"
          },
          {
              "Grantee": {
                  "URI": "http://acs.amazonaws.com/groups/global/AllUsers"
              },
              "Permission": "READ"
          }
      ]
  }
The following command retrieves the Cross-Origin Resource Sharing configuration for a bucket named ``amzn-s3-demo-bucket``::

  aws s3api get-bucket-cors --bucket amzn-s3-demo-bucket

Output::

  {
      "CORSRules": [
          {
              "AllowedHeaders": [
                  "*"
              ],
              "ExposeHeaders": [
                  "x-amz-server-side-encryption"
              ],
              "AllowedMethods": [
                  "PUT",
                  "POST",
                  "DELETE"
              ],
              "MaxAgeSeconds": 3000,
              "AllowedOrigins": [
                  "http://www.example.com"
              ]
          },
          {
              "AllowedHeaders": [
                  "Authorization"
              ],
              "MaxAgeSeconds": 3000,
              "AllowedMethods": [
                  "GET"
              ],
              "AllowedOrigins": [
                  "*"
              ]
          }
      ]
  }

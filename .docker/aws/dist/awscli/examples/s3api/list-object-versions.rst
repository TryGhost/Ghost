The following command retrieves version information for an object in a bucket named ``amzn-s3-demo-bucket``::

  aws s3api list-object-versions --bucket amzn-s3-demo-bucket --prefix index.html

Output::

  {
      "DeleteMarkers": [
          {
              "Owner": {
                  "DisplayName": "my-username",
                  "ID": "7009a8971cd660687538875e7c86c5b672fe116bd438f46db45460ddcd036c32"
              },
              "IsLatest": true,
              "VersionId": "B2VsEK5saUNNHKcOAJj7hIE86RozToyq",
              "Key": "index.html",
              "LastModified": "2015-11-10T00:57:03.000Z"
          },
          {
              "Owner": {
                  "DisplayName": "my-username",
                  "ID": "7009a8971cd660687538875e7c86c5b672fe116bd438f46db45460ddcd036c32"
              },
              "IsLatest": false,
              "VersionId": ".FLQEZscLIcfxSq.jsFJ.szUkmng2Yw6",
              "Key": "index.html",
              "LastModified": "2015-11-09T23:32:20.000Z"
          }
      ],
      "Versions": [
          {
              "LastModified": "2015-11-10T00:20:11.000Z",
              "VersionId": "Rb_l2T8UHDkFEwCgJjhlgPOZC0qJ.vpD",
              "ETag": "\"0622528de826c0df5db1258a23b80be5\"",
              "StorageClass": "STANDARD",
              "Key": "index.html",
              "Owner": {
                  "DisplayName": "my-username",
                  "ID": "7009a8971cd660687538875e7c86c5b672fe116bd438f46db45460ddcd036c32"
              },
              "IsLatest": false,
              "Size": 38
          },
          {
              "LastModified": "2015-11-09T23:26:41.000Z",
              "VersionId": "rasWWGpgk9E4s0LyTJgusGeRQKLVIAFf",
              "ETag": "\"06225825b8028de826c0df5db1a23be5\"",
              "StorageClass": "STANDARD",
              "Key": "index.html",
              "Owner": {
                  "DisplayName": "my-username",
                  "ID": "7009a8971cd660687538875e7c86c5b672fe116bd438f46db45460ddcd036c32"
              },
              "IsLatest": false,
              "Size": 38
          },
          {
              "LastModified": "2015-11-09T22:50:50.000Z",
              "VersionId": "null",
              "ETag": "\"d1f45267a863c8392e07d24dd592f1b9\"",
              "StorageClass": "STANDARD",
              "Key": "index.html",
              "Owner": {
                  "DisplayName": "my-username",
                  "ID": "7009a8971cd660687538875e7c86c5b672fe116bd438f46db45460ddcd036c32"
              },
              "IsLatest": false,
              "Size": 533823
          }
      ]
  }

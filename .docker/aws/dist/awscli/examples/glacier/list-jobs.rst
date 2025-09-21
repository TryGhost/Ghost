The following command lists in-progress and recently completed jobs for a vault named ``my-vault``::

  aws glacier list-jobs --account-id - --vault-name my-vault

Output::

  {
      "JobList": [
          {
              "VaultARN": "arn:aws:glacier:us-west-2:0123456789012:vaults/my-vault",
              "RetrievalByteRange": "0-3145727",
              "SNSTopic": "arn:aws:sns:us-west-2:0123456789012:my-vault",
              "Completed": false,
              "SHA256TreeHash": "9628195fcdbcbbe76cdde932d4646fa7de5f219fb39823836d81f0cc0e18aa67",
              "JobId": "l7IL5-EkXyEY9Ws95fClzIbk2O5uLYaFdAYOi-azsX_Z8V6NH4yERHzars8wTKYQMX6nBDI9cMNHzyZJO59-8N9aHWav",
              "ArchiveId": "kKB7ymWJVpPSwhGP6ycSOAekp9ZYe_--zM_mw6k76ZFGEIWQX-ybtRDvc2VkPSDtfKmQrj0IRQLSGsNuDp-AJVlu2ccmDSyDUmZwKbwbpAdGATGDiB3hHO0bjbGehXTcApVud_wyDw",
              "JobDescription": "Retrieve archive on 2015-07-17",
              "ArchiveSizeInBytes": 3145728,
              "Action": "ArchiveRetrieval",
              "ArchiveSHA256TreeHash": "9628195fcdbcbbe76cdde932d4646fa7de5f219fb39823836d81f0cc0e18aa67",
              "CreationDate": "2015-07-17T21:16:13.840Z",
              "StatusCode": "InProgress"
          },
          {
              "InventoryRetrievalParameters": {
                  "Format": "JSON"
              },
              "VaultARN": "arn:aws:glacier:us-west-2:0123456789012:vaults/my-vault",
              "Completed": false,
              "JobId": "zbxcm3Z_3z5UkoroF7SuZKrxgGoDc3RloGduS7Eg-RO47Yc6FxsdGBgf_Q2DK5Ejh18CnTS5XW4_XqlNHS61dsO4CnMW",
              "Action": "InventoryRetrieval",
              "CreationDate": "2015-07-17T20:23:41.616Z",
              "StatusCode": ""InProgress""
          }
      ]
  }

Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.

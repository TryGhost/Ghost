The following command retrieves information about an inventory retrieval job on a vault named ``my-vault``::

  aws glacier describe-job --account-id - --vault-name my-vault --job-id zbxcm3Z_3z5UkoroF7SuZKrxgGoDc3RloGduS7Eg-RO47Yc6FxsdGBgf_Q2DK5Ejh18CnTS5XW4_XqlNHS61dsO4CnMW

Output::

  {
      "InventoryRetrievalParameters": {
          "Format": "JSON"
      },
      "VaultARN": "arn:aws:glacier:us-west-2:0123456789012:vaults/my-vault",
      "Completed": false,
      "JobId": "zbxcm3Z_3z5UkoroF7SuZKrxgGoDc3RloGduS7Eg-RO47Yc6FxsdGBgf_Q2DK5Ejh18CnTS5XW4_XqlNHS61dsO4CnMW",
      "Action": "InventoryRetrieval",
      "CreationDate": "2015-07-17T20:23:41.616Z",
      "StatusCode": "InProgress"
  }

The job ID can be found in the output of ``aws glacier initiate-job`` and ``aws glacier list-jobs``.
Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.

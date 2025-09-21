The following command lists the vaults in the default account and region::

  aws glacier list-vaults --account-id -

Output::

  {
      "VaultList": [
          {
              "SizeInBytes": 3178496,
              "VaultARN": "arn:aws:glacier:us-west-2:0123456789012:vaults/my-vault",
              "LastInventoryDate": "2015-04-07T00:26:19.028Z",
              "VaultName": "my-vault",
              "NumberOfArchives": 1,
              "CreationDate": "2015-04-06T21:23:45.708Z"
          }
      ]
  }

Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.
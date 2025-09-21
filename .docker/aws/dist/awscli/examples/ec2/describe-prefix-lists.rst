**To describe prefix lists**

This example lists all available prefix lists for the region.

Command::

  aws ec2 describe-prefix-lists

Output::

  {
    "PrefixLists": [
      {
        "PrefixListName": "com.amazonaws.us-east-1.s3", 
        "Cidrs": [
          "54.231.0.0/17"
        ], 
        "PrefixListId": "pl-63a5400a"
      }
    ]
  }

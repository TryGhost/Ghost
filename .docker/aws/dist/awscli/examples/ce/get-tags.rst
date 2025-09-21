**To retrieve keys and values for a cost allocation tag**

This example retrieves all cost allocation tags with a key of "Project" and a value that contains "secretProject".

Command::

  aws ce get-tags --search-string secretProject --time-period Start=2017-01-01,End=2017-05-18 --tag-key Project
  
Output::
	
  {
    "ReturnSize": 2,
    "Tags": [
      "secretProject1",
      "secretProject2"
    ],
    "TotalSize": 2
  }

**To list AWS Direct Connect partners and locations**

The following ``describe-locations`` command lists AWS Direct Connect partners and locations in the current region::

  aws directconnect describe-locations

Output::

  {
      "locations": [
          {
              "locationName": "NAP do Brasil, Barueri, Sao Paulo", 
              "locationCode": "TNDB"
          }, 
          {
              "locationName": "Tivit - Site Transamerica (Sao Paulo)", 
              "locationCode": "TIVIT"
          }
      ]
  }
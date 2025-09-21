**To list all public keys for a trail**

The following ``list-public-keys`` command returns all public keys whose private keys were used to sign the digest files within the specified time range::

  aws cloudtrail list-public-keys --start-time 2016-01-01T20:30:00.000Z

Output::

  {
    "PublicKeyList": [
        {
           "ValidityStartTime": 1453076702.0, 
           "ValidityEndTime": 1455668702.0, 
           "Value": "MIIBCgKCAQEAlSS3cl92HDycr/MTj0moOhas8habjrraXw+KzlWF0axSI2tcF+3iJ9BKQAVSKxGwxwu3m0wG3J+kUl1xboEcEPHYoIYMbgfSw7KGnuDKwkLzsQWhUJ0cIbOHASox1vv/5fNXkrHhGbDCHeVXm804c83nvHUEFYThr1PfyP/8HwrCtR3FX5OANtQCP61C1nJtSSkC8JSQUOrIP4CuwJjc+4WGDk+BGH5m9iuiAKkipEHWmUl8/P7XpfpWQuk4h8g3pXZOrNXr08lbh4d39svj7UqdhvOXoBISp9t/EXYuePGEtBdrKD9Dz+VHwyUPtBQvYr9BnkF88qBnaPNhS44rzwIDAQAB", 
           "Fingerprint": "7f3f401420072e50a65a141430817ab3"
       }
    ]
  }
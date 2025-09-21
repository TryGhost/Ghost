**To describe Reserved Instances modifications**

This example command describes all the Reserved Instances modification requests that have been submitted for your account.

Command::

  aws ec2 describe-reserved-instances-modifications

Output::

  {
      "ReservedInstancesModifications": [
          {
              "Status": "fulfilled",
              "ModificationResults": [
                  {
                      "ReservedInstancesId": "93bbbca2-62f1-4d9d-b225-16bada29e6c7",
                      "TargetConfiguration": {
                          "AvailabilityZone": "us-east-1b",
                          "InstanceType": "m1.large",
                          "InstanceCount": 3
                      }
                  },
                  {
                       "ReservedInstancesId": "1ba8e2e3-aabb-46c3-bcf5-3fe2fda922e6",
                       "TargetConfiguration": {
                           "AvailabilityZone": "us-east-1d",
                           "InstanceType": "m1.xlarge",
                           "InstanceCount": 1
                       }
                   }
              ],
              "EffectiveDate": "2015-08-12T17:00:00.000Z",
              "CreateDate": "2015-08-12T17:52:52.630Z",
              "UpdateDate": "2015-08-12T18:08:06.698Z",
              "ClientToken": "c9adb218-3222-4889-8216-0cf0e52dc37e:
              "ReservedInstancesModificationId": "rimod-d3ed4335-b1d3-4de6-ab31-0f13aaf46687",
              "ReservedInstancesIds": [
                  {
                      "ReservedInstancesId": "b847fa93-e282-4f55-b59a-1342f5bd7c02"
                  }
              ]
          }
      ]
  }



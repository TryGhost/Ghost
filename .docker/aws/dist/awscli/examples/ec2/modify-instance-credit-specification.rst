**To modify the credit option for CPU usage of an instance**

This example modifies the credit option for CPU usage of the specified instance in the specified region to "unlimited". Valid credit options are "standard" and "unlimited".

Command::

  aws ec2 modify-instance-credit-specification --instance-credit-specification "InstanceId=i-1234567890abcdef0,CpuCredits=unlimited"

Output::

  {
    "SuccessfulInstanceCreditSpecifications": [
      {
        "InstanceId": "i-1234567890abcdef0"
      }
    ], 
    "UnsuccessfulInstanceCreditSpecifications": []
  }

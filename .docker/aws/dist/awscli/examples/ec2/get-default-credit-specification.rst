**To describe the default credit option**

The following ``get-default-credit-specification`` example describes the default credit option for T2 instances. ::

  aws ec2 get-default-credit-specification \
      --instance-family t2

Output::

    {
        "InstanceFamilyCreditSpecification": {
            "InstanceFamily": "t2",
            "CpuCredits": "standard"
        }
    }

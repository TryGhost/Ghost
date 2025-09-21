**To register instances with a load balancer**

This example registers the specified instance with the specified load balancer.

Command::

  aws elb register-instances-with-load-balancer --load-balancer-name my-load-balancer --instances i-d6f6fae3

Output::

   {
      "Instances": [
          {
              "InstanceId": "i-d6f6fae3"
          },
          {
              "InstanceId": "i-207d9717"
          },
          {
              "InstanceId": "i-afefb49b"
          }
      ]
   }


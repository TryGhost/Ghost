**To purchase a Dedicated Host Reservation**

This example purchases the specified Dedicated Host Reservation offering for the specified Dedicated Host in your account.

Command::

  aws ec2 purchase-host-reservation --offering-id hro-03f707bf363b6b324 --host-id-set h-013abcd2a00cbd123

Output::

  {
    "TotalHourlyPrice": "1.499", 
    "Purchase": [
        {
            "HourlyPrice": "1.499", 
            "InstanceFamily": "m4", 
            "PaymentOption": "NoUpfront", 
            "HostIdSet": [
                "h-013abcd2a00cbd123"
            ], 
            "HostReservationId": "hr-0d418a3a4ffc669ae", 
            "UpfrontPrice": "0.000", 
            "Duration": 31536000
        }
    ], 
    "TotalUpfrontPrice": "0.000"
  }
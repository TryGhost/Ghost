**To describe Dedicated Host Reservation offerings**

This example describes the Dedicated Host Reservations for the M4 instance family that are available to purchase.

Command::

  aws ec2 describe-host-reservation-offerings --filter Name=instance-family,Values=m4

Output::

  {
    "OfferingSet": [
        {
            "HourlyPrice": "1.499", 
            "OfferingId": "hro-03f707bf363b6b324", 
            "InstanceFamily": "m4", 
            "PaymentOption": "NoUpfront", 
            "UpfrontPrice": "0.000", 
            "Duration": 31536000
        }, 
        {
            "HourlyPrice": "1.045", 
            "OfferingId": "hro-0ef9181cabdef7a02", 
            "InstanceFamily": "m4", 
            "PaymentOption": "NoUpfront", 
            "UpfrontPrice": "0.000", 
            "Duration": 94608000
        }, 
        {
            "HourlyPrice": "0.714", 
            "OfferingId": "hro-04567a15500b92a51", 
            "InstanceFamily": "m4", 
            "PaymentOption": "PartialUpfront", 
            "UpfrontPrice": "6254.000", 
            "Duration": 31536000
        }, 
        {
            "HourlyPrice": "0.484", 
            "OfferingId": "hro-0d5d7a9d23ed7fbfe", 
            "InstanceFamily": "m4", 
            "PaymentOption": "PartialUpfront", 
            "UpfrontPrice": "12720.000", 
            "Duration": 94608000
        }, 
        {
            "HourlyPrice": "0.000", 
            "OfferingId": "hro-05da4108ca998c2e5", 
            "InstanceFamily": "m4", 
            "PaymentOption": "AllUpfront", 
            "UpfrontPrice": "23913.000", 
            "Duration": 94608000
        }, 
        {
            "HourlyPrice": "0.000", 
            "OfferingId": "hro-0a9f9be3b95a3dc8f", 
            "InstanceFamily": "m4", 
            "PaymentOption": "AllUpfront", 
            "UpfrontPrice": "12257.000", 
            "Duration": 31536000
        }
    ]
  }
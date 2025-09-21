**Example 1: To retrieve details about all of your Elastic IP addresses**

The following ``describe addresses`` example displays details about your Elastic IP addresses. ::

    aws ec2 describe-addresses

Output::

    {
        "Addresses": [
            {
                "InstanceId": "i-1234567890abcdef0",
                "PublicIp": "198.51.100.0",
                "PublicIpv4Pool": "amazon",
                "Domain": "standard"
            },
            {
                "Domain": "vpc",
                "PublicIpv4Pool": "amazon",
                "InstanceId": "i-1234567890abcdef0",
                "NetworkInterfaceId": "eni-12345678",
                "AssociationId": "eipassoc-12345678",
                "NetworkInterfaceOwnerId": "123456789012",
                "PublicIp": "203.0.113.0",
                "AllocationId": "eipalloc-12345678",
                "PrivateIpAddress": "10.0.1.241"
            }
        ]
    }

**Example 2: To retrieve details your Elastic IP addresses for EC2-VPC**

The following ``describe-addresses`` example displays details about your Elastic IP addresses for use with instances in a VPC. ::

    aws ec2 describe-addresses \
        --filters "Name=domain,Values=vpc"

Output::

    {
        "Addresses": [
            {
                "Domain": "vpc",
                "PublicIpv4Pool": "amazon",
                "InstanceId": "i-1234567890abcdef0",
                "NetworkInterfaceId": "eni-12345678",
                "AssociationId": "eipassoc-12345678",
                "NetworkInterfaceOwnerId": "123456789012",
                "PublicIp": "203.0.113.0",
                "AllocationId": "eipalloc-12345678",
                "PrivateIpAddress": "10.0.1.241"
            }
        ]
    }

**Example 3: To retrieve details about an Elastic IP address specified by allocation ID**

The following ``describe-addresses`` example displays details about the Elastic IP address with the specified allocation ID, which is associated with an instance in EC2-VPC. ::

    aws ec2 describe-addresses \
        --allocation-ids eipalloc-282d9641

Output::

    {
        "Addresses": [
            {
                "Domain": "vpc",
                "PublicIpv4Pool": "amazon",
                "InstanceId": "i-1234567890abcdef0",
                "NetworkInterfaceId": "eni-1a2b3c4d",
                "AssociationId": "eipassoc-123abc12",
                "NetworkInterfaceOwnerId": "1234567891012",
                "PublicIp": "203.0.113.25",
                "AllocationId": "eipalloc-282d9641",
                "PrivateIpAddress": "10.251.50.12"
            }
        ]
    }

**Example 4: To retrieve details about an Elastic IP address specified by its VPC private IP address**

The following ``describe-addresses`` example displays details about the Elastic IP address associated with a particular private IP address in EC2-VPC. ::

    aws ec2 describe-addresses \
        --filters "Name=private-ip-address,Values=10.251.50.12"

**Example 5: To retrieve details about Elastic IP addresses in EC2-Classic**

TThe following ``describe-addresses`` example displays details about your Elastic IP addresses for use in EC2-Classic. ::

    aws ec2 describe-addresses \
        --filters "Name=domain,Values=standard"
    
Output::

    {
        "Addresses": [
            {
                "InstanceId": "i-1234567890abcdef0", 
                "PublicIp": "203.0.110.25", 
                "PublicIpv4Pool": "amazon",
                "Domain": "standard"
            }
        ]
    }

**Example 6: To retrieve details about an Elastic IP addresses specified by its public IP address**

The following ``describe-addresses`` example displays details about the Elastic IP address with the value ``203.0.110.25``, which is associated with an instance in EC2-Classic. ::

    aws ec2 describe-addresses \
        --public-ips 203.0.110.25

Output::

    {
        "Addresses": [
            {
                "InstanceId": "i-1234567890abcdef0", 
                "PublicIp": "203.0.110.25", 
                "PublicIpv4Pool": "amazon",
                "Domain": "standard"
            }
        ]
    }


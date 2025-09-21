**To scale an EC2 Fleet**

The following ``modify-fleet`` example modifies the target capacity of the specified EC2 Fleet. If the specified value is greater than the current capacity, the EC2 Fleet launches additional instances. If the specified value is less than the current capacity, the EC2 Fleet cancels any open requests and if the termination policy is ``terminate``, the EC2 fleet terminates any instances that exceed the new target capacity. ::

    aws ec2 modify-fleet \
        --fleet-ids fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE \
        --target-capacity-specification TotalTargetCapacity=5

Output::

    {
        "Return": true
    }

For more information, see `Manage an EC2 Fleet <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-ec2-fleet.html>`__ in the *Amazon EC2 User Guide*.

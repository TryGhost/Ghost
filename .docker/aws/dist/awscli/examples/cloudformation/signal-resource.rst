**To signal a resource**

The following ``signal-resource`` example signals ``success`` to fulfill the wait condition named ``MyWaitCondition`` in the stack named ``my-stack``. ::

    aws cloudformation signal-resource \
        --stack-name my-stack \
        --logical-resource-id MyWaitCondition \
        --unique-id 1234 \
        --status SUCCESS

This command produces no output.
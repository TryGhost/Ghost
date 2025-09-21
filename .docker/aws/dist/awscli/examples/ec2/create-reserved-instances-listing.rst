**To list a Reserved Instance in the Reserved Instance Marketplace**

The following ``create-reserved-instances-listing`` example creates a listing for the specified Reserved Instance in the Reserved Instance Marketplace. ::

    aws ec2 create-reserved-instances-listing \
        --reserved-instances-id 5ec28771-05ff-4b9b-aa31-9e57dexample \
        --instance-count 3 \
        --price-schedules CurrencyCode=USD,Price=25.50 \
        --client-token 550e8400-e29b-41d4-a716-446655440000

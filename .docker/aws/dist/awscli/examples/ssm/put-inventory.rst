**To assign customer metadata to an instance**

This example assigns rack location information to an instance. There is no output if the command succeeds.

Command (Linux)::

  aws ssm put-inventory --instance-id "i-016648b75dd622dab" --items '[{"TypeName": "Custom:RackInfo","SchemaVersion": "1.0","CaptureTime": "2019-01-22T10:01:01Z","Content":[{"RackLocation": "Bay B/Row C/Rack D/Shelf E"}]}]'

Command (Windows)::

  aws ssm put-inventory --instance-id "i-016648b75dd622dab" --items "TypeName=Custom:RackInfo,SchemaVersion=1.0,CaptureTime=2019-01-22T10:01:01Z,Content=[{RackLocation='Bay B/Row C/Rack D/Shelf F'}]"
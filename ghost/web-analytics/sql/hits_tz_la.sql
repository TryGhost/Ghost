select
    toTimeZone(timestamp, 'America/Los_Angeles') as timestamp_la,
    *
from _mv_hits__v${TB_VERSION:-0}

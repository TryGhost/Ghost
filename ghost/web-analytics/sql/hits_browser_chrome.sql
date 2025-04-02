select
    row_number() over () as row_num,
    dense_rank() over (order by session_id) as session_num,
    *
from (
select timestamp, session_id, browser, os, device, location, pathname from _mv_hits__v${TB_VERSION:-0}
where browser = 'chrome'
order by session_id, timestamp
)

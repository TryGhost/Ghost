select h.timestamp, h.session_id, h.browser, h.os, h.device, h.location, h.pathname, s.source
from _mv_hits__v${TB_VERSION:-0} h
    join mv_session_data__v${TB_VERSION:-0} s
        on _mv_hits__v${TB_VERSION:-0}.session_id = mv_session_data__v${TB_VERSION:-0}.session_id
where device = 'desktop'
order by timestamp

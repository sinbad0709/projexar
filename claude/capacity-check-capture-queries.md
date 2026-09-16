*Conversion rate by input shape — the question the store exists to answer:*

sql
select
  s.toolset,
  s.single_view,
  count(*)                                        as sessions,
  count(g.session_id)                             as converted,
  round(100.0 * count(g.session_id) / count(*), 1) as pct
from (
  select distinct on (session_id) session_id, toolset, single_view
  from public.capacity_check_submissions
  where event = 'submit'
  order by session_id, created_at
) s
left join (
  select distinct session_id
  from public.capacity_check_submissions
  where event = 'gate_passed'
) g on g.session_id = s.session_id
group by 1, 2
order by sessions desc;

*What the people who did not convert looked like:*

sql
select *
from public.capacity_check_submissions s
where s.event = 'submit'
  and not exists (
    select 1 from public.capacity_check_submissions g
    where g.session_id = s.session_id and g.event = 'gate_passed'
  );

*How often people resubmit within a session:*

sql
select submissions, count(*) as sessions
from (
  select session_id, count(*) as submissions
  from public.capacity_check_submissions
  where event = 'submit'
  group by session_id
) t
group by 1
order by 1;

One caveat on all three. The session identifier lives in page memory, so a reload starts a new session. These queries describe submissions grouped by sitting, not people. A row count is not a visitor count and should never be reported as one.
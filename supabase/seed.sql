-- Demo data so you can try the login right away.
-- Org code: DEMO   Username: lottie   PIN: 1234
-- Delete this org before going live.

insert into public.organizations (id, name, join_code)
values ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'DEMO')
on conflict do nothing;

insert into public.learners (id, org_id, display_name, username)
values ('00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-000000000001', 'Lottie Tester', 'lottie')
on conflict do nothing;

select public.set_learner_pin('00000000-0000-0000-0000-0000000000a1', '1234');

insert into public.courses (slug, title, title_es, minutes, storage_path, is_published)
values ('slips-trips-falls', 'Slips, Trips and Falls', 'Resbalones, tropiezos y caídas', 6,
        'lottie/slips-trips-falls/v1/bilingual.html', true)
on conflict (slug) do nothing;

insert into public.assignments (org_id, course_id)
select '00000000-0000-0000-0000-000000000001', id from public.courses
 where slug = 'slips-trips-falls'
   and not exists (select 1 from public.assignments
                    where org_id = '00000000-0000-0000-0000-000000000001');

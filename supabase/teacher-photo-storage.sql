insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'teacher-photos',
  'teacher-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

drop policy if exists "Teacher photos are publicly readable" on storage.objects;
drop policy if exists "Authenticated users can upload teacher photos" on storage.objects;
drop policy if exists "Authenticated users can update teacher photos" on storage.objects;
drop policy if exists "Authenticated users can delete teacher photos" on storage.objects;

create policy "Teacher photos are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'teacher-photos');

create policy "Authenticated users can upload teacher photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'teacher-photos');

create policy "Authenticated users can update teacher photos"
on storage.objects
for update
to authenticated
using (bucket_id = 'teacher-photos')
with check (bucket_id = 'teacher-photos');

create policy "Authenticated users can delete teacher photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'teacher-photos');

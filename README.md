# AcademyPro AI System v2 Upgrade

This package includes the requested UI and feature upgrade:

- Public website improved across pages
- No Admin/Login button on public navbar
- Public AI live chat remains on public website
- Teachers public page and featured teacher section
- Admin teachers module
- Teacher salary page
- Class schedule / batch page
- Subjects page
- Fees page can add a new student while collecting fee
- Student IDs and Teacher IDs
- Public AI can answer classes, fees, timings, teachers, admission process, discount, address, contact
- Admin sidebar has Teachers, Subjects, Schedules, Salaries, Reports, Settings

## Important setup after extracting

1. Copy your old `.env.local` into this project.
2. Run:

```bash
npm install
npm run dev
```

3. In Supabase SQL Editor run:

```txt
supabase/teacher-upgrade.sql
```

This creates:

- teachers
- class_schedules
- teacher_salaries
- student_enrollments
- student_code tracking
- teacher_code tracking
- public read policies for website / AI chat

## Admin access

Public website does not show an admin button. Admin is still accessible manually by typing:

```txt
/login
/admin
```

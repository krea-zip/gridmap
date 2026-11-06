# gridmap

Plan your whole degree at Krea University, one trimester at a time. Pick your batch and programmes, drag courses onto the grid, and gridmap tracks your credits and checks the plan as you build it.

**[Open gridmap ↗](https://kcal-delta.vercel.app)**

gridmap is the first project from [krea_zip](https://github.com/krea-zip), a growing set of tools for student life at Krea. It started out as kcal, so you'll still see that name in the app for now.

## What's there for you?

<table>
<tr>
<td width="50%" valign="top">

### [Course planner ↗](https://kcal-delta.vercel.app)

Lay out every trimester of your degree, starting from a suggested path for your programmes.

</td>
<td width="50%" valign="top">

### Credit tracking

See the credits you've planned against what your degree and each programme needs.

</td>
</tr>
<tr>
<td valign="top">

### Plan checks

Missed prerequisites, courses that don't run that trimester and credit limits show up as plain hints on your plan.

</td>
<td valign="top">

### Grades and CGPA

Add your grades to see your TGPA and CGPA, trimester by trimester. Best on a laptop.

</td>
</tr>
<tr>
<td valign="top">

### [Course catalogue ↗](https://kcal-delta.vercel.app/courses)

Browse every [course](https://kcal-delta.vercel.app/courses), [programme](https://kcal-delta.vercel.app/programmes) and [lecturer](https://kcal-delta.vercel.app/lecturers), or search by name, code or lecturer in the planner.

</td>
<td valign="top">

### Save and print

Keep named copies of your plan in your browser, and print the one you settle on.

</td>
</tr>
</table>

## More from krea_zip

Coming next, each as its own project: important documents, clubs and professors.

## To do

### High priority

- [ ] Feedback form sends nowhere: it still posts to Netlify, but the site is on Vercel (`POST /` returns 405)
- [ ] Don't load Supabase or call `/api/account` for guests while Google sign-in is off
- [ ] Use `$env/static/public` so hydration doesn't wait on `/_app/env.js`
- [ ] Run server functions in `sin1`, next to the database (they run in `iad1`)
- [ ] Self-host Ubuntu Sans instead of the render-blocking Google Fonts `@import`
- [ ] Don't show the sample plan before a student's own plan has loaded
- [ ] Cut Vercel routes: 1,870 of the 2,048 limit, since every prerendered page costs two
- [ ] Add a favicon, a page description for the planner and a social preview

### Medium priority

- [ ] Rename kcal to gridmap in the app and docs, keeping the `kcal-` storage keys so saved plans survive
- [ ] Load rarely used parts on demand: welcome, settings, grades, what-if, credit rules
- [ ] Fetch course descriptions when a course is first opened, not for everyone
- [ ] Split `plan.svelte.ts` (2,064 lines) into history, saving, credit claims and what-if
- [ ] Break up `DetailsPanel.svelte` (1,330 lines)
- [ ] Prune `office_history`: every save keeps a full copy of the draft
- [ ] Tell open tabs when a new catalogue is published (`version.pollInterval`, `updated`)
- [ ] Back button closes course details on a phone (shallow routing)
- [ ] Add security headers
- [ ] Migrate to SvelteKit 3 (Vite 8, TypeScript 6, `$lib` becomes `#lib`)
- [ ] Remove unused code and the retired tables (`course_reviews`, `office_staff`, `office_submissions`)
- [ ] Move the old curriculum seed (`compiler.ts` and its source JSON) out of `src/lib`
- [ ] Finish the work-in-progress views: will it run?, prerequisites, what-if
- [ ] Turn Google sign-in back on
- [ ] Test phone sizes: 320, 360, 375, 390, 412 and 430px

## Notes

### Run it

```bash
npm install
npm run dev
```

### Find a deleted file in git history

```bash
git log --all --full-history -- "**/welcome/Demo.svelte"
```

### Add an icon

1. Draw it on a 16×16 grid as an SVG path made of whole-pixel rectangles
2. Add the path to `paths` in `src/lib/components/PixelIcon.svelte`, and its name to the `name` prop's type
3. Use it: `<PixelIcon name="gear" size="1.6rem" snap />`

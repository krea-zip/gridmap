# kcal — interactive presentation handoff

## Copy this prompt into the next session

Build a short, polished, graphical browser presentation pitching **kcal to Krea’s academic office** as a replacement for students’ manual course-mapping and credit-tracking spreadsheet workflow. Also produce a concise companion write-up that can be emailed or included in a proposal. Work in `/home/toad/code/kcal`.

The presentation should explain the value through real student decisions, not a long feature inventory. The central idea is: **“From recording courses to planning a degree.”** Show how a student chooses a course, understands what it counts toward, sees where it fits, checks progress, and explores alternatives. Preserve kcal’s quiet plum/pink visual identity, with mint green for suitable drop destinations. Use large, readable text, generous space, real UI snippets, and clear annotations. Aim for 7–9 slides and a 4–6 minute presentation.

### Audience and tone

Address academic-office staff who currently have students use Excel. Respect the existing template: it already performs useful calculations. Explain how kcal reduces repeated entry and brings programme requirements, course information, and planning checks together. State intended benefits as hypotheses for a pilot, not proven results. Do not invent student numbers, time savings, testimonials, official endorsement, or guarantees of graduation eligibility.

### Read these inputs first

- Spreadsheet: `/home/toad/temp/Course Mapping + Credits Tracking Template.xlsx`.
- App: this repository; `README.md`, `docs/pitch.md`, `src/lib/planner`, and the components listed below.
- `docs/pitch.md` is an older pitch. Reuse useful ideas, but independently verify its claims; avoid its absolute claim that an impossible degree cannot be built.
- The working tree contains many existing, unrelated changes. Preserve them. Add presentation files without rewriting planner functionality or overwriting the older pitch.
- Screenshots supplied by the user have been copied to `static/pitch/assets/`:
  - `choices.png`: major/concentration choice pools, including “pick 3,” methodology, world history, and Indian history groups.
  - `views.png`: grades, “will it run?”, prerequisites, and what-if menu previews.
  - `course.png`: “either one counts,” courses it leads to, and course description.
  - `faculty.png`: Soumya Dey’s faculty card, office hours, contact/profile link, and recent teaching.
- Additional capture work was started for `planner.png` and `drag-fit.png` in that same directory. Check whether the files exist and visually inspect them before using them. The capture script is `/tmp/kcal-pitch-capture.mjs`; it uses a synthetic student plan, not a real student record.
- Original attached files, if still available: `/tmp/codex-clipboard-j3Yg2v.png`, `/tmp/codex-clipboard-78dFMO.png`, `/tmp/codex-clipboard-7hrDy8.png`, `/tmp/codex-clipboard-rOytS0.png`.

### What was verified about the workbook

It has Intro, Overview, programme-specific Main sheets, a GPA Tracker, and sample sheets. Main variants include double major, major + minor, and major + minor + concentration.

Its instructions explicitly describe manual entry of trimester, code, title, credits, faculty, required/elective status, discipline, cross-listing, prerequisites, and grades. It already has formulas for totals, credit deficit/surplus, and GPA calculations. It also provides colour coding and an overview across 12 trimesters. The Intro warns users not to delete formulas when entering data.

Therefore, do **not** claim “Excel cannot calculate credits/GPA” or “the spreadsheet has no prerequisites.” The fair comparison is **manually recording and interpreting information versus catalogue-linked planning with contextual checks and interactive views**. ExcelJS is installed and can inspect the workbook. Avoid dumping merged cells repeatedly when extracting text.

### Suggested slide sequence

1. **A degree plan should help you decide.**
   - Introduce kcal as an interactive degree planner for Krea students.
   - Subtitle: “Course mapping, credit tracking, and the next decision — in one place.”
   - Use a large real planner screenshot with two or three restrained labels identifying the catalogue, trimester grid, and degree progress.
   - Establish the proposal: replace the student-facing spreadsheet planning workflow, subject to academic-office review and a pilot.

2. **The template gives students a structure. kcal connects the pieces.**
   - Show a readable excerpt or faithful labelled rendering of the actual spreadsheet beside the app.
   - A compact comparison can cover:
     - Manually enter course information → choose a catalogue course.
     - Maintain credit/category tables → see progress update with the plan.
     - Record prerequisites → see prerequisite relationships and placement warnings.
     - Rework a plan across sheets → move courses and explore alternatives visually.
     - Enter grades into a separate tracker → use the grades view on the plan.
   - Credit the workbook’s existing formulas and organisation; do not caricature it as useless.

3. **Pick it up. See where it fits.**
   - Make drag-and-drop the visual centrepiece.
   - Capture the real app during a drag: suitable trimester cells turn mint green; unsuitable cells fade; a landing marker shows the proposed location.
   - Add a close-up of the dragged chip and the green background, with concise annotations: “Suitable placement,” “Other terms fade,” and “Warnings explain conflicts.”
   - Include a small interactive demo if feasible. Drag a course or select it with a keyboard/touch-friendly button, then choose a trimester. Clearly label any reconstructed demo as illustrative. Prefer using actual app behaviour where practical.
   - Explain checks in plain language: recorded offering trimester, year eligibility, prerequisite order, and credit/load warnings where supported by the actual rules.
   - **Accuracy:** faded destinations can still accept a drop. The app warns; it does not universally block invalid plans. Do not call green a guarantee of official approval or future availability.

4. **Know which choices complete your programme.**
   - Use `choices.png`, enlarged enough to read.
   - Explain named course-choice groups: “pick 3” for mathematics and category-specific choices for history.
   - Show that requirements can be choices within groups, not just a total credit target.
   - If interactive, demonstrate selecting from a bounded illustrative group and updating its remaining count. Do not imply a screenshot itself is interactive.
   - Explain “not offered yet” as missing recorded offering evidence, without promising future scheduling.

5. **Navigate the degree by clicking the plan itself.**
   - Show the whole-degree grid and an actual trimester zoom.
   - Show that clicking a trimester opens its detailed view.
   - Show clicking the trimester heading to switch between year-relative naming and continuous degree numbering (for example year 2 trimester 1 = trimester 4).
   - Explain the current-trimester marker separately from label switching. Verify the control for changing the current trimester before demonstrating it.
   - Avoid conflating “change how terms are named,” “open a term,” and “set where I am now.”

6. **One plan. Several useful questions.**
   - Use `views.png` and small focused snippets from the actual views where possible.
   - Grades: enter grades and see TGPA/CGPA.
   - Will it run?: see how often a course ran in that trimester in the recorded history. Historical evidence is not a future timetable guarantee.
   - Prerequisites: see what a course needs and what it leads to.
   - What-if: try another programme against the existing plan and inspect what would change. Verify apply/reset behaviour before making claims about preservation or saving.
   - If using tabs, make each tab change the visual and explanation, not just its styling.

7. **The context behind every course.**
   - Pair `course.png` and `faculty.png` as two readable, selectively cropped snippets.
   - Course detail: alternatives where “either one counts,” downstream courses, description, and recent teaching.
   - Make the distinction explicit: the screenshot says these are **separate courses**, not a cross-listed course. Do not label them as cross-listing.
   - Faculty detail: office hours, profile/contact information, and recent teaching history when available.
   - Frame this as helping students make informed choices and prepare for advising. Do not imply historical instructors are confirmed for a future offering.

8. **A practical next step for the academic office.**
   - Propose a small pilot alongside the existing process, with replacement considered after validation.
   - Ask the office to validate programme rules and requirement mappings, identify a reliable source for current offerings, and nominate a contact for corrections.
   - Evaluate: time to assemble a plan, mismatches identified before registration, unresolved rule exceptions, and feedback from students and advisors.
   - End with a concrete ask: “Could we validate the rules together and pilot kcal with a small group of students?”
   - Separate existing features from proposed institutional support. Do not claim that student planning equals official registration or approval.

### Optional bonus features

Only add these if confirmed in the current code and they strengthen the pitch: saved plans, sharing/export, different programme structures, credit-load hints, required/elective progress, and an office workflow for maintaining curriculum data. Keep the main deck short. An appendix can hold extra features, source notes, and a longer demo sequence. Do not advertise an admin backend merely because unfinished code exists.

### Interaction and presentation requirements

- Previous/next buttons, arrow-key navigation, visible slide count, and direct slide selection.
- Accessible focus states, semantic controls, good contrast, and reduced-motion support.
- Responsive layout; readable on a laptop/projector, with a sensible stacked mobile view.
- Fullscreen control if supported, and print CSS for clean PDF export with one slide per page.
- No autoplay or excessive animation. Use movement only to explain a course being placed, a requirement being satisfied, or a view changing.
- Screenshots should be cropped to the relevant UI and displayed at readable sizes. Remove distracting capture borders through cropping/layout if needed; preserve the interface content. Do not fabricate an app screenshot.
- Every graphic should answer a specific question. Use a green drop-state screenshot prominently, not only decorative course cards.
- Keep the deck self-contained where possible: local image assets, no required external fonts or network calls.
- Add brief presenter notes or a separate narration file with a 20–40 second explanation per slide. Include a fallback narration for the drag interaction if a live demo fails.
- Include a 150–250 word companion write-up and a short opening/closing pitch.

### Useful source locations and behaviour already checked

- `src/lib/components/sidebar/ChoicePools.svelte`: named choice groups.
- `src/lib/components/board/grid/PlanGrid.svelte`: whole-plan grid and drag handling.
- `src/lib/components/board/grid/TrimesterCell.svelte`: `can-drop` and `no-fit` states; clicking opens trimester zoom. Its CSS describes mint suitable cells and faded unsuitable cells, which still accept a drop.
- `src/lib/components/board/grid/TrimHead.svelte`: clicking a heading toggles `plan.trimNaming` between `year` and `degree`.
- `src/lib/planner/calendar.ts`: year-relative/continuous numbering. The current-term guess uses approximate month ranges and is not a published academic calendar.
- `src/lib/components/board/TrimesterZoom.svelte`: trimester details.
- `src/lib/components/board/bar/ViewMenu.svelte`: view menu and preview chips.
- `src/lib/components/board/WhatIfBar.svelte`, `src/lib/planner/boardViews.ts`, `src/lib/planner/plan.svelte.ts`: what-if and other views.
- `src/lib/components/details/DetailsPanel.svelte`, `CourseFaculty.svelte`: course and teaching details.
- `src/lib/planner/rules.ts`: warnings and requirement checks.
- `tests/browser/programmes.spec.ts`: example of loading a synthetic plan through localStorage for screenshots.

### Implementation and handoff

Prefer a self-contained presentation at `static/pitch/index.html` with local assets and minimal JavaScript, or a dedicated route if that fits the repository better. There is no completed deck yet. Do not confuse the copied assets with a finished presentation.

The prior session started Vite at `http://127.0.0.1:4188`; check whether it still runs before starting another server. Chromium is available at `/nix/store/js1fbcm7ylv92nrjcn32ahmn3786460a-chromium-155.0.8059.84/bin/chromium`. Browser launch was blocked by the sandbox, and an escalated run of `node /tmp/kcal-pitch-capture.mjs` was approved. Follow the environment’s permission requirements for any further browser work.

Verify slide navigation, any interactive demo, image loading, narrow-screen layout, and print output. Inspect representative screenshots, not just HTTP status. Avoid rebuilding or changing unrelated app features. Provide the resulting file/preview path, companion write-up, and a short account of what was tested. Do not claim the presentation is published unless deployment was actually requested/performed and confirmed.

## Short draft write-up

kcal is a visual degree planner designed to take over the course-mapping and credit-tracking work students currently do in a spreadsheet. The existing template provides useful structure and calculations, but students still enter course details and interpret programme requirements themselves. kcal connects the course catalogue, trimester plan, and degree requirements in one interface.

Students can drag courses into their plan and see suitable placements highlighted in green, with warnings for conflicts. Programme-specific choice groups make requirements such as “pick three” or “choose a methodology course” easier to understand. Students can open individual trimesters, switch trimester numbering, track grades, inspect prerequisites, and explore a different programme through a what-if view.

Course details add context: which alternatives count toward a requirement, what a course leads to, and what it covers. Faculty profiles bring together available office hours, contact information, and recent teaching. Offering history supports planning while remaining distinct from a confirmed future timetable.

The proposal is to validate kcal’s rules and data with the academic office, then run a small student pilot. The pilot would assess planning effort, errors identified before registration, and the usefulness of the tool in advising. With that validation, kcal could replace the manual spreadsheet workflow while academic decisions and registration remain with the university.

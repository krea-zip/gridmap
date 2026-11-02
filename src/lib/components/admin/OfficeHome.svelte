<script lang="ts">
 import {getContext} from 'svelte';import {OFFICE_CONTEXT,type Workspace} from '$lib/features/office/workspace.svelte';
 const office=getContext<Workspace>(OFFICE_CONTEXT);
 const jobs=[
  ['/admin/import','Upload course list','Import the office’s CSV or Excel spreadsheet. Review every change before saving.'],
  ['/admin/offerings','Prepare a trimester','Set up offerings, sections, teaching assignments and eligibility.'],
  ['/admin/courses','Manage courses','Find a course, update its information or add a new one.'],
  ['/admin/requirements','Manage degree requirements','Edit batch curricula, required courses, choices and suggested pathways.'],
  ['/admin/approvals','Review requests','Check approvals, clarification requests and department submissions.'],
  ['/admin/changes','Review & publish','Preview the student planner, approve a revision and publish it.']
 ];
</script>
<h1>Academic office</h1><p class="office-lead">Maintain the information students use to plan their degrees.</p>
<div class="office-stats">
 <a href="/admin/courses"><b>{office.document?.curriculum.courses.filter(c=>!c.retired).length}</b><span>Active courses</span></a>
 <a href="/admin/offerings"><b>{office.document?.offerings.filter(o=>o.term===office.term).length}</b><span>Offerings in selected term</span></a>
 <a href="/admin/approvals"><b>{office.document?.offerings.filter(o=>o.approval==='submitted'||o.approval==='clarification').length}</b><span>Awaiting review</span></a>
 <a href="/admin/changes"><b>{office.errors.length}</b><span>Errors to resolve</span></a>
</div>
<h2>What would you like to do?</h2><div class="office-job-grid">{#each jobs as [href,title,body]}<a class="office-job" {href}><b>{title}<span aria-hidden="true"> →</span></b><span>{body}</span></a>{/each}</div>
<section class="office-card"><h2>How changes reach students</h2><ol class="office-steps"><li><b>Edit</b><span>Update records or import a spreadsheet.</span></li><li><b>Save draft</b><span>Keep work for the office to review.</span></li><li><b>Review & approve</b><span>Check changes and the student preview.</span></li><li><b>Publish</b><span>Release approved information and update the website.</span></li></ol></section>
{#if office.issues.length}<section class="office-card"><h2>Needs attention</h2><p>{office.errors.length} errors and {office.issues.length-office.errors.length} warnings. Existing catalogue gaps can be corrected gradually; errors must be resolved before publication.</p><ul>{#each office.issues.slice(0,5) as issue}<li><b>{issue.record||issue.area}</b> — {issue.message}</li>{/each}</ul><a href="/admin/changes">View all checks →</a></section>{/if}

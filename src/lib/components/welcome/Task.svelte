<script lang="ts">
	let {
		steps,
		at,
		complete = 'you’ve got it! try again, or go to the next component.'
	}: { steps: string[]; at: number; complete?: string } = $props();
</script>

<div class="task" role="status" aria-live="polite">
	<span class="task-icon" aria-hidden="true">{at >= steps.length ? '✓' : '✿'}</span>
	<div>
		<span class="task-label">{at >= steps.length ? 'lovely' : `try ${at + 1} of ${steps.length}`}</span>
		<p>{steps[at] ?? complete}</p>
	</div>
	<div class="task-dots" aria-hidden="true">
		{#each steps as _, i (i)}<i class:done={i < at} class:now={i === at}></i>{/each}
	</div>
</div>

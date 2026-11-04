<script lang="ts">
	import { usePlan } from '$lib/planner/context';
	import { byCode } from '$lib/curriculum/data';
	import type { Hint } from '$lib/types';
	let {
		code,
		selected = false,
		onclick,
		onremove,
		ondragstart,
		mark
	}: {
		code: string;
		selected?: boolean;
		onclick?: () => void;
		onremove?: () => void;
		ondragstart?: (event: DragEvent) => void;
		mark?: Hint['kind'];
	} = $props();
	const plan = usePlan();
</script>

{#snippet label()}
	{#if mark}<i class="mark" data-kind={mark}></i>{/if}
	{#if plan.showCodes}<b>{plan.shownCode(code)}</b>{/if}
	{#if plan.showTitles}<span class="course-title">{byCode(code).title}</span>{/if}
{/snippet}
<div class="course-piece">
	{#if onclick}<button
			class="mini-course"
			class:lit={selected}
			title={`${plan.courseLabel(code)} · ${plan.courseType(code)}`}
			data-code={code}
			data-type={plan.courseType(code)}
			style:--hue={plan.hueOf(code)}
			aria-pressed={selected}
			draggable={!!ondragstart}
			{ondragstart}
			{onclick}>{@render label()}</button
		>
	{:else}<div
			class="mini-course"
			class:lit={selected}
			title={`${plan.courseLabel(code)} · ${plan.courseType(code)}`}
			data-code={code}
			data-type={plan.courseType(code)}
			style:--hue={plan.hueOf(code)}
		>
			{@render label()}
		</div>{/if}

	{#if onremove}<button class="chip-remove" aria-label="remove {plan.shownCode(code)}" onclick={onremove}>×</button
		>{/if}
</div>

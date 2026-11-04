<script lang="ts">
	import { onDestroy } from 'svelte';
	import { usePlan } from '$lib/planner/context';
	import { usePractice } from './practice-context';
	import { byCode, hasCode } from '$lib/curriculum/data';
	import Task from './Task.svelte';
	const plan = usePlan();
	const { detail: code } = usePractice();
	const pre = byCode(code).prereqs.find(hasCode);
	if (!plan.placedCodes.has(code)) {
		const slot = plan.years
			.flatMap((year) => plan.trims.map((trim) => ({ year, trim })))
			.find((p) => plan.canDrop(code, p.year, p.trim));
		if (slot) plan.place(code, slot.year, slot.trim);
	}
	let step = $state(0);
	let problems = $state(true);
	let warnings = $state(true);
	let open = $state<string | null>(null);
	let advisory = $state(false);
	let lit = $derived(open === 'warn' && problems);
	$effect(() => {
		plan.highlight = lit ? [code] : [];
	});
	onDestroy(() => (plan.highlight = []));
</script>

<Task
	steps={[
		'open “prerequisites first”.',
		'tap ▲ 1 to hide problems.',
		'tap ▲ 1 again to bring them back.',
		'open advisories to meet the star.'
	]}
	at={step}
	complete="▲ fix a rule · ■ check a warning · ★ useful context"
/>
<div class="scene narrow">
	<div class="sample hint-sample">
		<div class="spread">
			<span class="eyebrow">hints</span><span class="badges"
				><button
					class="badge"
					class:off={!problems}
					data-kind="warn"
					role="checkbox"
					aria-checked={problems}
					aria-label="show problems"
					onclick={() => {
						problems = !problems;
						if (!problems && step >= 1) step = 2;
						else if (problems && step >= 2) step = 3;
					}}><i class="mark" data-kind="warn"></i>1</button
				><button
					class="badge"
					class:off={!warnings}
					data-kind="caution"
					role="checkbox"
					aria-checked={warnings}
					aria-label="show warnings"
					onclick={() => (warnings = !warnings)}><i class="mark" data-kind="caution"></i>1</button
				></span
			>
		</div>
		{#if problems}<div class="hint">
				<button
					class="hint-title"
					aria-expanded={open === 'warn'}
					onclick={() => {
						open = open === 'warn' ? null : 'warn';
						if (open) step = Math.max(step, 1);
					}}><i class="mark" data-kind="warn"></i><b>prerequisites first</b><span>›</span></button
				>{#if open === 'warn'}<p class="hint-text">
						▲ problem · {plan.shownCode(code)} needs {pre ? plan.shownCode(pre) : 'its prerequisite'} earlier.
					</p>{/if}
			</div>{/if}
		{#if warnings}<div class="hint">
				<button
					class="hint-title"
					aria-expanded={open === 'caution'}
					onclick={() => (open = open === 'caution' ? null : 'caution')}
					><i class="mark" data-kind="caution"></i><span>too few credits</span><span>›</span></button
				>{#if open === 'caution'}<p class="hint-text">■ warning · check this term’s credit minimum.</p>{/if}
			</div>{/if}
		{#if !problems && !warnings}<p class="feedback">both hidden · tap a badge to show them again</p>{/if}
		<button
			class="hint-title advisory"
			aria-expanded={advisory}
			onclick={() => {
				advisory = !advisory;
				if (advisory) step = 4;
			}}><span>advisories</span><span>★ 1 {advisory ? '−' : '+'}</span></button
		>
		{#if advisory}<p class="hint-text">
				<i class="mark" data-kind="info"></i> advisory · extra context, outside the issue counts.
			</p>{/if}
	</div>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;
	.mark {
		@include severity-mark;
		width: 1rem;
		height: 1rem;
	}
	.badges {
		display: flex;
		gap: 0.5rem;
	}
	.badge {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0.6rem;
		font: inherit;
		font-size: 1.15rem;
		color: var(--color-text);
		border: 1px solid var(--color-border-card);
		border-radius: 4px;
		cursor: pointer;
		background: var(--color-hint-warn);
		box-shadow: var(--shadow-inset);
	}
	.badge[data-kind='caution'] {
		background: var(--color-hint-caution);
	}
	.badge.off {
		opacity: 0.35;
		box-shadow: none;
	}
	.hint {
		border-top: 1px dotted var(--color-border-light);
	}
	.hint-title {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.9rem 0;
		width: 100%;
		font: inherit;
		text-align: left;
		color: inherit;
		background: none;
		border: 0;
		cursor: pointer;
	}
	.hint-title > span:last-child {
		margin-left: auto;
	}
	.hint-text {
		padding: 0 0 0.8rem 1.6rem;
		font-size: 1.15rem;
		color: var(--color-text-muted);
	}
	.advisory {
		font-size: 1.1rem;
		border-top: 1px dotted var(--color-border-light);
		color: var(--color-text-muted);
	}
</style>

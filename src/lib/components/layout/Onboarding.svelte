<script lang="ts">
	// A first visit: on a laptop, the welcome card (your degree) then the
	// guided tour; on a phone, a one-time note that kcal is roomier on a laptop
	// and a short written tour. The tour can be asked for again from settings.
	import { onMount } from 'svelte';
	import Intro from '$lib/components/Intro.svelte';
	import Welcome from '$lib/components/Welcome.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { viewport } from '$lib/planner/viewport.svelte';

	let { tour = $bindable(false), skip = false }: { tour?: boolean; skip?: boolean } = $props();

	const INTRO_KEY = 'kcal-intro-seen';
	const PHONE_NOTE_KEY = 'kcal-phone-note-seen';

	let welcome = $state(false);
	let phoneNote = $state(false);

	onMount(() => {
		if (skip) return;
		try {
			welcome = !localStorage.getItem(INTRO_KEY);
			// its own key, so a laptop later in the same browser still gets the welcome
			phoneNote = welcome && !localStorage.getItem(PHONE_NOTE_KEY);
		} catch {
			welcome = phoneNote = true;
		}
	});

	function remember(key: string) {
		try {
			localStorage.setItem(key, '1');
		} catch {
			// dismissal still works when browser storage is unavailable
		}
	}

	function dismissPhoneNote() {
		phoneNote = false;
		remember(PHONE_NOTE_KEY);
	}

	function dismissTour() {
		tour = false;
		remember(INTRO_KEY);
	}
</script>

{#if phoneNote && !viewport.desktop}
	<Modal title="better on a laptop" onclose={dismissPhoneNote}>
		<div class="note">
			<p>kcal is better used on a laptop.</p>
			<button onclick={dismissPhoneNote}>continue on phone</button>
		</div>
	</Modal>
{/if}

{#if welcome && viewport.desktop}
	<Welcome
		ondone={() => {
			welcome = false;
			tour = true;
		}}
	/>
{/if}

{#if tour}
	{#if viewport.desktop}
		<Intro onclose={dismissTour} />
	{:else}
		<Modal title="a quick tour" onclose={dismissTour}>
			<div class="note">
				<p>
					<b>Catalogue</b>: search courses or lecturers, filter by department, and tap any course for its description,
					prerequisites and lecturers.
				</p>
				<p>
					<b>Your plan</b>: tap a course to add, move, remove or grade it. Tap a trimester for a closer look.
				</p>
				<p>
					<b>Your degree</b>: choose your programme, check progress and hints, import courses and grades, and open
					settings to save copies or change the theme.
				</p>
				<p>Your plan saves automatically in this browser.</p>
			</div>
		</Modal>
	{/if}
{/if}

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.note {
		display: grid;
		gap: 1.6rem;
		font-size: 1.6rem;
		line-height: 1.6;
	}

	button {
		@include modal-button;
	}
</style>

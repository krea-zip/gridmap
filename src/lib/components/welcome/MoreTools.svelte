<p class="intro">you can skip around this tour with the menu above. here’s where the rest lives.</p>
<dl>
	<div>
		<dt>↶ / ↷</dt>
		<dd>undo / redo edits. Ctrl+Z / Ctrl+Shift+Z also work.</dd>
	</div>
	<div>
		<dt>suggested path</dt>
		<dd>
			compare with your department’s order. dashed suggestions add a course; add missing / drop extras tidy the plan.
		</dd>
	</div>
	<div>
		<dt>your degree</dt>
		<dd>
			change batch, degree length or programmes in the sidebar. on a phone, use the bottom tabs for your degree, your
			plan and catalogue.
		</dd>
	</div>
	<div>
		<dt>settings ⚙</dt>
		<dd>
			theme, text size, saved plans and sharing. your draft saves in this browser; sign in with your Krea account for
			named copies across devices.
		</dd>
	</div>
	<div>
		<dt>save & share</dt>
		<dd>
			save a fresh copy after edits. create a share link for a snapshot, or export PDF / text. disable links in
			settings.
		</dd>
	</div>
	<div>
		<dt>make room</dt>
		<dd>on desktop, drag panel dividers to resize. the pin in course details keeps that panel beside your plan.</dd>
	</div>
	<div>
		<dt>need a label?</dt>
		<dd>
			click ? (“what’s what”) on desktop. the course, programme and lecturer directories are linked in settings → help.
		</dd>
	</div>
</dl>

<style>
	.intro {
		margin-bottom: 1.4rem;
		font-size: 1.3rem;
		line-height: 1.5;
		color: var(--color-text-muted);
	}
	dl {
		display: grid;
		gap: 1rem;
		padding: 1.4rem;
		border: 1px solid var(--color-border-card);
		border-radius: 14px;
		background: var(--color-bg-light);
	}
	dl > div {
		display: grid;
		grid-template-columns: 10rem minmax(0, 1fr);
		gap: 1rem;
	}
	dt,
	dd {
		font-size: 1.2rem;
		line-height: 1.5;
	}
	dt {
		font-weight: 600;
		color: var(--color-text);
	}
	dd {
		margin: 0;
		color: var(--color-text-muted);
	}
	@media (max-width: 600px) {
		dl > div {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.2rem;
		}
	}
</style>

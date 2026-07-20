<script lang="ts">
	import { href } from '$lib/paths'
</script>

<svelte:head><title>About — Raschpëtzer</title></svelte:head>

<div class="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8">
	<h1 class="mb-6 text-2xl font-bold tracking-tight">About this wiki</h1>

	<div class="flex flex-col gap-5 leading-7 text-foreground">
		<p>
			This wiki is striving to be the most accurate and complete reference on the Raschpëtzer
			— the Roman-era qanat (underground water-supply gallery) rediscovered near Walferdange,
			Luxembourg — covering its shafts, gallery, finds, geology, and the people who researched
			it.
		</p>

		<h2 class="mt-2 text-lg font-semibold tracking-tight">Sourcing</h2>
		<p>
			Every specific fact — a measurement, a date, a name, a quote — is meant to carry its own
			citation, not just a general reference somewhere in the article. Citations link either
			to a specific page of the vendored 2018 site brochure (<em
				>The Raschpëtzer — A Roman Underground Water Supply System</em
			>, published by the Syndicat d'initiative et de tourisme de la Commune de Walferdange)
			or to a real, independently checkable external source. Where something couldn't be
			independently verified, the article says so plainly rather than filling the gap in.
		</p>

		<h2 class="mt-2 text-lg font-semibold tracking-tight">A work in progress</h2>
		<p>
			This wiki is a work in progress by the Raschpëtzer group to document everything they
			know about the site in one place — not an official publication of any government,
			museum, or tourism body, though it draws directly on their published material and
			credits it throughout. Building it out, errors are inevitable: a fact stated too
			confidently, a citation that doesn't quite support what it's attached to, a detail
			that's since been superseded. If you spot one, please get in touch —
			<a
				href="mailto:raschpetzer@tomfaber.id"
				class="text-primary underline decoration-primary/40 underline-offset-2"
				>raschpetzer@tomfaber.id</a
			>.
		</p>

		<h2 class="mt-2 text-lg font-semibold tracking-tight">Scope</h2>
		<p>
			Alongside the qanat itself, the wiki covers its individual shafts, the surrounding
			geology and aquifer, related archaeological finds, the site's excavation history, the
			researchers and photographers involved, and the qanat concept more broadly — see <a
				href={href('/categories')}
				class="text-primary underline decoration-primary/40 underline-offset-2"
				>Categories</a
			>
			for the full breakdown, or browse everything from
			<a
				href={href('/')}
				class="text-primary underline decoration-primary/40 underline-offset-2"
				>All Articles</a
			>.
		</p>
	</div>
</div>

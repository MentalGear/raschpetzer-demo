/**
 * Real content: a deep-dive on the inferred Roman villa the Raschpëtzer qanat is thought to
 * have supplied. The specific site is UNCONFIRMED — sourced from the companion data repo
 * `raschpetzer-model-digital-3d`'s `data/site.json` `villa` object (`status: 'inferred'`,
 * `confidence: 'low'`, a geo coordinate explicitly marked as a working estimate, not a
 * survey) plus the primary-source brochure it cites (vendored at `static/sources/`). General
 * context on Roman villa water supply, and the separately-documented (and separately
 * excavated) Roman villa at Helmsange/Sonnebierg in the same commune, are sourced from
 * external references found via web search — see the citations below. This article must not
 * overstate certainty beyond `raschpetzer-walferdange.ts`'s "The inferred Roman recipient
 * site" section: the qanat's specific recipient has not been excavated or surveyed, and nothing
 * here should read as if it had been.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not imported
// from ./mock) so this module has no circular dependency on it; mock.ts is the one that
// imports articles/categories FROM here to append to its exported corpus.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Static-asset paths aren't rewritten by SvelteKit's router the way `href`/`goto` targets
 *  are (see `$lib/paths`'s `href`) — a citation `url` literal needs the GitHub Pages
 *  project-subpath base prefixed by hand, or it 404s under a non-root `BASE_PATH` deploy
 *  (works locally where `base` is `''`, breaks in prod otherwise). Mirrors raschpetzer.ts /
 *  raschpetzer-walferdange.ts's helper of the same name. */
const asset = (path: string): string => `${base}${path}`

// Page locators per data/sources.json's `_prov` map / docs/RASCHPETZER_DATA.md in the
// raschpetzer-model-digital-3d repo — kept as plain page/#page anchors (not a search/
// highlight viewer): opens the vendored PDF directly at the cited page, new tab.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	brochureRole: {
		id: 'c-villa-brochure-p4',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 4, site facts)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=4`,
	},
	brochureFlow: {
		id: 'c-villa-brochure-p9',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, flow direction toward the recipient site)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=9`,
	},
	// The `villa` record in data/site.json itself is the source for the inferred-vs-surveyed
	// distinction and the working-estimate coordinate — it's an unpublished model dataset
	// (CC-BY-4.0, no public URL of its own), so this citation carries no `url`, matching the
	// optional-url shape `Citation` allows for a source that is real but not web-addressable.
	ssotVillaRecord: {
		id: 'c-villa-ssot-record',
		title: 'Raschpëtzer Qanat SSOT dataset — the `villa` record (data/site.json)',
		authors: 'Raschpëtzer visualization project',
		year: 2026,
		publisher: 'raschpetzer-model-digital-3d (CC-BY-4.0)',
	},
	wikipediaRaschpetzer: {
		id: 'c-villa-wikipedia-raschpetzer',
		title: 'Raschpëtzer Qanat',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Raschp%C3%ABtzer_Qanat',
	},
	wikipediaVillaRustica: {
		id: 'c-villa-wikipedia-villarustica',
		title: 'Villa rustica',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Villa_rustica',
	},
	wikipediaRomanAqueduct: {
		id: 'c-villa-wikipedia-aqueduct',
		title: 'Roman aqueduct',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Roman_aqueduct',
	},
	walferHelmsangeVilla: {
		id: 'c-villa-walfer-helmsange',
		title: 'Roman Villa (Helmsange, at the foot of the Sonnebierg)',
		publisher: 'Commune de Walferdange (walfer.lu)',
		url: 'https://walfer.lu/en/touristic_site/villa-romaine-3/',
	},
	visitLuxembourgWalferdange: {
		id: 'c-villa-visitluxembourg-walferdange',
		title: 'Walferdange',
		publisher: 'Visit Luxembourg (official tourism board)',
		url: 'https://www.visitluxembourg.com/place/walferdange',
	},
} satisfies Record<string, Citation>

export const villaCitations = c

export const villaArticle: Article = {
	id: 'a-villa',
	slug: 'inferred-villa',
	locale: 'en',
	title: 'The Inferred Roman Villa',
	summary:
		"The Raschpëtzer qanat's water flowed toward a Roman-era estate believed to have stood downslope, at the western end of the gallery, in the Alzette valley — but that recipient site has never been excavated or surveyed. Its location in the model dataset is a low-confidence working estimate, not a confirmed find, placed there because the qanat's water had to go somewhere and a rural villa is the most plausible destination for a gravity-fed gallery of this kind.",
	categories: ['archaeology', 'history'],
	infobox: [
		{ label: 'Status', value: 'Inferred — not excavated or surveyed' },
		{ label: 'Confidence', value: 'Low' },
		{ label: 'Role', value: 'Water recipient at the western (valley) end of the qanat' },
		{
			label: 'Position (model estimate)',
			value: '49.667° N, 6.140° E — working estimate, not a survey',
		},
		{ label: 'Approx. elevation', value: '≈ 330 m a.s.l.' },
		{
			label: 'Relative to qanat',
			value: 'Downslope from the 720 m gallery, western/valley end',
		},
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' qanat was engineered to carry spring water some 720 metres downhill, east to west, toward the ',
				),
				link('Alzette valley', 'walferdange'),
				t('.'),
				cite(
					' A gallery built with that much precision and effort had to be terminating somewhere — the working assumption in the site model is a Roman-era rural estate at the valley end of the route',
					'c-villa-brochure-p9',
				),
				t(
					', but no such site has ever been excavated or surveyed there. This article is a deep-dive on that inferred destination: what the evidence for it consists of, why a villa is the plausible kind of recipient, and what remains unconfirmed.',
				),
			),
		},
		{
			id: 'h-inferred',
			type: 'heading',
			level: 2,
			text: 'An inferred destination, not an excavated site',
		},
		{
			id: 'p-inferred',
			type: 'paragraph',
			runs: p(
				cite(
					"The site model carries a record for a 'Roman villa (inferred recipient)' with the role of water recipient at the western, valley end of the qanat, at an approximate elevation of 330 metres above sea level",
					'c-villa-ssot-record',
				),
				t(' — downslope from the plateau catchments the qanat draws on.'),
				cite(
					' Both its status and confidence fields are explicit: status is recorded as inferred, and confidence as low.',
					'c-villa-ssot-record',
				),
				t(
					' Its position — 49°40′00.3″N 6°08′24.5″E — is likewise flagged in the source data as ',
				),
				b('a working estimate, not a surveyed location'),
				cite(
					': it exists so the model has somewhere to point the qanat at, not because fieldwork has located a building there.',
					'c-villa-ssot-record',
				),
			),
		},
		{
			id: 'call-not-excavated',
			type: 'callout',
			variant: 'warning',
			title: 'Not excavated, not surveyed',
			runs: p(
				t(
					"Nothing at the inferred coordinate has been tested by excavation, geophysical survey, or field-walking. The marker records a hypothesis about where the qanat's water was going, not a confirmed archaeological find. Treat every distance, elevation, and coordinate in this section as a modelling convenience, not a measurement of a real structure.",
				),
			),
		},
		{ id: 'h-water', type: 'heading', level: 2, text: 'Water and the Roman rural estate' },
		{
			id: 'p-villa-rustica',
			type: 'paragraph',
			runs: p(
				t('A '),
				b('villa rustica'),
				cite(
					' — the working, agricultural core of a Roman country estate, as distinct from the more purely residential villa urbana — typically combined a residence with farm buildings, storage, and space for labourers and livestock',
					'c-villa-wikipedia-villarustica',
				),
				t(
					'. Wherever it stood, a Roman estate of any size needed a dependable water supply for more than drinking: heated bath suites with under-floor hypocaust heating, kitchens, livestock, and — where the land allowed — irrigation of gardens and fields all depended on it.',
				),
			),
		},
		{
			id: 'p-private-aqueducts',
			type: 'paragraph',
			runs: p(
				t(
					'A villa near a town could sometimes draw a licensed share of the public aqueduct supply, but a rural estate away from any municipal network had to secure its own source — a nearby spring, a well, or, for the wealthiest owners, a purpose-built private aqueduct.',
				),
				cite(
					" One well-documented example: the senator Mumius Niger Valerius Vegetus bought the rights to a neighbour's spring, plus a right of way across the intervening land, and built an aqueduct just under 10 kilometres long to carry that water to his own villa — a project substantial enough to need senatorial approval.",
					'c-villa-wikipedia-aqueduct',
				),
				t(
					' A gravity-fed underground gallery like the Raschpëtzer, tapping a plateau spring line and running downhill to a single rural destination, is the same basic solution at a larger engineering scale — built to serve one estate, not a town.',
				),
			),
		},
		{
			id: 'p-wikipedia-claim',
			type: 'paragraph',
			runs: p(
				t(
					'External summaries of the qanat go further than the site model does on this point: ',
				),
				cite(
					'Wikipedia\'s article on the Raschpëtzer states that the qanat "appears to have provided water for a large Roman villa on the slopes of the Alzette valley."',
					'c-villa-wikipedia-raschpetzer',
				),
				t(
					" That is a reasonable reading of the qanat's engineering — a 720-metre gravity gallery aimed squarely at the valley has to have been built for a specific recipient — but it is a general claim about the qanat's purpose, not a location for, or an excavation of, the specific building. The site model's own inferred coordinate should be read as one candidate placement for that recipient, not as confirmation of it.",
				),
			),
		},
		{
			id: 'h-known-villa',
			type: 'heading',
			level: 2,
			text: 'A documented villa nearby — but not confirmed as this one',
		},
		{
			id: 'p-known-villa',
			type: 'paragraph',
			runs: p(
				t(
					'The commune does have a genuine, independently excavated Roman villa on record: ',
				),
				cite(
					'a large residence at the foot of the Sonnebierg in Helmsange, only recognised in its full extent during excavations carried out in 1990–1994 ahead of a housing development.',
					'c-villa-walfer-helmsange',
				),
				cite(
					' At almost 100 metres long and more than 50 metres wide, with around 50 rooms on the ground floor alone, it followed the portico-and-projecting-wings plan typical of villas in the region — a residence contemporaries might fairly have called a small palace.',
					'c-villa-visitluxembourg-walferdange',
				),
				cite(
					' It was built in the middle of the 1st century AD and stayed in use, remodelled repeatedly, for more than three centuries; excavators recovered pottery spanning the 1st to 4th centuries, coins, a 3rd-century purse, and an unusually large number of cult-related objects, including part of a carved stone stele of deities.',
					'c-villa-walfer-helmsange',
				),
			),
		},
		{
			id: 'p-known-villa-hedge',
			type: 'paragraph',
			runs: p(
				t(
					"This Helmsange villa is a separate, well-documented site — it is not the same record as the site model's inferred recipient, and nothing ties the two together beyond both lying in the same stretch of the ",
				),
				link('Alzette valley', 'walferdange'),
				t(
					'. What it does establish is that Roman villas of real substance were built in exactly this landscape, which lends the general premise — that the qanat served a rural estate rather than a town — independent plausibility. It is corroborating context, not proof of the specific inferred site.',
				),
			),
		},
		{
			id: 'h-confirm',
			type: 'heading',
			level: 2,
			text: 'What it would take to confirm the site',
		},
		{
			id: 'p-confirm',
			type: 'paragraph',
			runs: p(
				t(
					"Turning the inferred marker into an actual find would take fieldwork that has not been undertaken here. A first step would be a non-invasive geophysical survey — resistivity or magnetometry — over the inferred coordinate and its surroundings, looking for the buried wall lines, hypocaust pillars, or rubble spreads that mark a Roman residence. Field-walking for surface pottery and building-material scatter across the western end of the qanat's route would help narrow down where to look before any ground is broken.",
				),
			),
		},
		{
			id: 'l-confirm-steps',
			type: 'list',
			ordered: true,
			items: [
				p(
					t(
						"Extend exploration of the gallery itself westward — only 310 of the qanat's 720 metres have been explored to date",
					),
					cite(
						", so the conduit's own downstream end is not yet reached, let alone its destination.",
						'c-villa-brochure-p4',
					),
				),
				p(
					t(
						'Run a geophysical survey (resistivity/magnetometry) over the inferred coordinate and the surrounding valley slope to look for buried structure before excavating.',
					),
				),
				p(
					t(
						'Field-walk the western end of the route for surface pottery and building-material scatter, the same categories of find (pottery, coins, cult objects) recovered at the excavated Helmsange villa, to see whether a comparable assemblage turns up.',
					),
				),
				p(
					t(
						'Only then would a targeted excavation trench be justified — and only excavation, not modelling, can turn an inferred marker into a confirmed site.',
					),
				),
			],
		},
	],
	citations: [
		c.brochureRole,
		c.brochureFlow,
		c.ssotVillaRecord,
		c.wikipediaRaschpetzer,
		c.wikipediaVillaRustica,
		c.wikipediaRomanAqueduct,
		c.walferHelmsangeVilla,
		c.visitLuxembourgWalferdange,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary: 'Initial draft: deep-dive on the inferred Roman villa water-recipient site',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

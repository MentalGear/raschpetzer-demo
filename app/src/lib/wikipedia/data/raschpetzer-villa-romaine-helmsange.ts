/**
 * Real content: the Roman villa excavated at Helmsange, at the foot of the Sonnebierg,
 * Walferdange — a genuine, independently excavated site, DISTINCT from the qanat's own
 * unconfirmed "inferred villa" (see `raschpetzer-villa.ts`, slug `inferred-villa`, which
 * already cites this Sonnebierg site as "a documented villa nearby, not confirmed as the
 * qanat's recipient"). This article gives that real, excavated site its own full treatment.
 *
 * Sourced from: the official Réimerpad ("Promenade des Romains") heritage-trail brochure
 * published by the Syndicat d'Initiative et de Tourisme de Walferdange / Administration
 * Communale de Walferdange (text: N. Kohl, 2001) — the excavation dates, excavator, the
 * "second-largest known Roman villa in the country, after Echternach" claim, dimensions,
 * room count, building phases, abandonment, and the Merovingian reoccupation all come from
 * that primary tourist-board document; plus walfer.lu's dedicated villa page (corroborated
 * via search after the page itself returned HTTP 503 on direct fetch, the same corroboration
 * pattern `raschpetzer-villa.ts` used for the same URL), visitluxembourg.com's dedicated
 * Helmsange site page, and vici.org's gazetteer entry for coordinates and classification.
 */
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not imported
// from ./mock) so this module has no circular dependency on it; mock.ts is the one that
// imports articles/categories FROM here to append to its exported corpus. Mirrors
// raschpetzer.ts / raschpetzer-villa.ts's helpers of the same name.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

// No `asset()`/`base` helper here (unlike raschpetzer.ts / raschpetzer-villa.ts) — this
// article carries no vendored images or asset-relative citation URLs (see `No images` in
// the task scope); every citation `url` below is an already-absolute external link.

const c = {
	reimerpad: {
		id: 'c-villa-romaine-reimerpad',
		title: 'Réimerpad / Promenade des Romains (heritage-trail brochure) — "Le palais romain de Helmsange"',
		authors: 'Kohl, N.',
		year: 2001,
		publisher: "Administration Communale de Walferdange / Syndicat d'Initiative et de Tourisme",
		url: 'https://www.sitwalfer.lu/reimerpad.pdf',
	},
	walfer: {
		id: 'c-villa-romaine-walfer',
		title: 'Roman Villa (Helmsange, at the foot of the Sonnebierg)',
		publisher: 'Commune de Walferdange (walfer.lu)',
		url: 'https://walfer.lu/en/touristic_site/villa-romaine-3/',
	},
	visitLuxembourg: {
		id: 'c-villa-romaine-visitluxembourg',
		title: 'Gallo-Roman site, Helmsange',
		publisher: 'Visit Luxembourg (official tourism board)',
		url: 'https://www.visitluxembourg.com/place/gallo-roman-site-helmsange',
	},
	vici: {
		id: 'c-villa-romaine-vici',
		title: 'Villa Romaine, Helmsange',
		publisher: 'vici.org (archaeological gazetteer)',
		url: 'https://vici.org/vici/10182/',
	},
} satisfies Record<string, Citation>

export const villaRomaineHelmsangeCitations = c

export const villaRomaineHelmsangeArticle: Article = {
	id: 'a-villa-romaine-helmsange',
	slug: 'villa-romaine-helmsange',
	locale: 'en',
	title: 'Villa Romaine (Helmsange)',
	summary:
		'A large Roman villa excavated between 1990 and 1994 at the foot of the Sonnebierg in Helmsange, Walferdange, Luxembourg — roughly 100 by 50 metres with some 50 ground-floor rooms, occupied from the mid-1st to the late 4th century AD. It is a real, independently confirmed site, not to be confused with the Raschpëtzer qanat\'s own unconfirmed "inferred villa," though its existence lends general plausibility to the idea that the qanat served a rural estate in this stretch of the Alzette valley.',
	categories: ['archaeology', 'history'],
	infobox: [
		{ label: 'Type', value: 'Excavated Roman villa (villa rustica)' },
		{ label: 'Location', value: 'Helmsange, foot of the Sonnebierg, Walferdange, Luxembourg' },
		{ label: 'Coordinates', value: '49.660° N, 6.140° E (approx.)' },
		{ label: 'Dimensions', value: '≈ 100 m × 50 m (≈ half a hectare)' },
		{ label: 'Rooms', value: '≈ 50 (ground floor alone)' },
		{ label: 'Built', value: 'c. mid-1st century AD' },
		{
			label: 'Occupied',
			value: 'c. AD 50 – late 4th century; reoccupied late 6th – early 8th century',
		},
		{ label: 'Excavated', value: '1990–1994' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				b('Villa Romaine'),
				t(' at '),
				link('Helmsange', 'helmsange'),
				t(', at the foot of the '),
				b('Sonnebierg'),
				t(' hill in the municipality of '),
				link('Walferdange', 'walferdange'),
				t(', is a large Roman villa complex '),
				cite(
					"discovered in 1990 and excavated by the archaeological service of the (then) Musée national d'Histoire et d'Art through 1994",
					'c-villa-romaine-reimerpad',
				),
				t(
					'. It is a genuine, independently confirmed and excavated site — distinct from the ',
				),
				link('inferred, unconfirmed villa', 'inferred-villa'),
				t(
					" that the nearby Raschpëtzer qanat is thought, but not known, to have supplied. This article covers the Helmsange villa on its own terms; its bearing on the qanat's still-unconfirmed destination is addressed separately below.",
				),
			),
		},
		{ id: 'h-excavation', type: 'heading', level: 2, text: 'Excavation' },
		{
			id: 'p-excavation',
			type: 'paragraph',
			runs: p(
				cite(
					'The site was only recognised in its full extent once preparatory groundwork began for a planned residential estate on the land',
					'c-villa-romaine-walfer',
				),
				t(
					', prompting a rescue excavation by the national archaeological service between 1990 and 1994.',
				),
				cite(
					' The dig uncovered what the municipal heritage trail brochure describes as the second-largest Roman villa yet excavated in the Grand Duchy, after the villa at Echternach',
					'c-villa-romaine-reimerpad',
				),
				cite(
					" — and separately, Visit Luxembourg's own listing for the site calls it one of the largest Roman villas discovered in the country",
					'c-villa-romaine-visitluxembourg',
				),
				t('.'),
			),
		},
		{ id: 'h-site', type: 'heading', level: 2, text: 'Site and layout' },
		{
			id: 'p-site',
			type: 'paragraph',
			runs: p(
				cite(
					'The main building covered close to 100 by 50 metres — around half a hectare — and comprised roughly 50 separate rooms on the ground floor alone',
					'c-villa-romaine-reimerpad',
				),
				cite(
					', following the portico-and-projecting-wings plan typical of villas in the region',
					'c-villa-romaine-walfer',
				),
				t(
					"; one surviving detail recorded from the excavation is a light shaft serving a large cellar in the building's south-east wing.",
				),
				cite(
					' vici.org catalogues the site as a villa rustica — the working, agricultural type of Roman country estate',
					'c-villa-romaine-vici',
				),
				cite(
					', roughly a kilometre from the Raschpëtzer qanat and about two kilometres from the Gallo-Roman temple site at Steinsel',
					'c-villa-romaine-vici',
				),
				t(
					' — part of the same cluster of Roman-era settlement in this stretch of the Alzette valley.',
				),
			),
		},
		{ id: 'h-occupation', type: 'heading', level: 2, text: 'Occupation and finds' },
		{
			id: 'p-occupation',
			type: 'paragraph',
			runs: p(
				cite(
					'The residence was built around the middle of the 1st century AD and remodelled repeatedly over more than three centuries of use',
					'c-villa-romaine-reimerpad',
				),
				t(
					', a construction date and occupation span that fits the artefact record recovered on site: ',
				),
				cite(
					'pottery spanning the 1st to 4th centuries, coins, a 3rd-century purse, and an unusually large number of cult-related objects, including part of a carved stone stele of deities probably dating to the 1st century AD',
					'c-villa-romaine-walfer',
				),
				t('.'),
			),
		},
		{
			id: 'p-abandonment',
			type: 'paragraph',
			runs: p(
				cite(
					'The villa was abandoned as a going residence at the end of the 4th century',
					'c-villa-romaine-reimerpad',
				),
				cite(
					', but the ruined site was not left empty for good: in the Merovingian period, roughly the late 6th to early 8th century, a family of Frankish settlers reoccupied the ground',
					'c-villa-romaine-reimerpad',
				),
				t(' — a second, much later chapter of use on top of the Roman-era ruins.'),
			),
		},
		{
			id: 'h-qanat',
			type: 'heading',
			level: 2,
			text: 'Relationship to the Raschpëtzer qanat',
		},
		{
			id: 'call-not-the-same',
			type: 'callout',
			variant: 'info',
			title: "A real villa nearby — not the qanat's confirmed destination",
			runs: p(
				t(
					'This is a separate, independently excavated and dated site. Nothing ties it directly to the ',
				),
				link('Raschpëtzer qanat', 'raschpetzer-qanat'),
				t("'s water supply, and it is not the same record as the qanat's own "),
				link('inferred recipient site', 'inferred-villa'),
				t(
					", whose location is an unexcavated, low-confidence working estimate elsewhere in the valley. Treat this villa as corroborating context for the idea that Roman estates of real substance stood in this landscape — not as proof of where the qanat's water actually went.",
				),
			),
		},
		{
			id: 'p-qanat-relationship',
			type: 'paragraph',
			runs: p(
				t(
					"The Helmsange villa and the Raschpëtzer qanat sit close enough together, and are old enough contemporaries, that the two are naturally discussed side by side: the municipality's own heritage trail, the ",
				),
				b('Réimerpad'),
				t(' ("Promenade des Romains"), '),
				cite(
					'is a 3.6-kilometre circuit that links the two as its two principal archaeological stops, starting at the crossroads of rue Prince Henri and rue Jean Schaack in Walferdange',
					'c-villa-romaine-reimerpad',
				),
				t('. That proximity is exactly why the villa is cited, in the deep-dive on the '),
				link("qanat's inferred recipient", 'inferred-villa'),
				t(
					', as evidence that the general premise — a rural Roman estate somewhere in this part of the Alzette valley needing a piped water supply — is plausible. It is independent, real corroboration of that premise. It is not, and should not be read as, confirmation of the specific unexcavated site the qanat model points to: the two are different locations with different evidentiary status, and only the Helmsange villa has actually been excavated.',
				),
			),
		},
		{ id: 'h-visiting', type: 'heading', level: 2, text: 'Visiting today' },
		{
			id: 'p-visiting',
			type: 'paragraph',
			runs: p(
				cite(
					'The excavated villa lies within the Cité Princesse Amélie residential estate built on the land after the dig',
					'c-villa-romaine-visitluxembourg',
				),
				t(
					", so unlike the qanat's viewing-window shafts, the site is not an open excavated ruin today; it is marked as a heritage stop on the Réimerpad trail",
				),
				cite(
					', with information panels at both archaeological sites on the circuit',
					'c-villa-romaine-reimerpad',
				),
				cite(
					', and guided tours arranged through the Walferdange municipal office',
					'c-villa-romaine-reimerpad',
				),
				t('.'),
			),
		},
	],
	citations: [c.reimerpad, c.walfer, c.visitLuxembourg, c.vici],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: the excavated Roman villa at Helmsange/Sonnebierg, cross-linked from the inferred-villa article',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

/**
 * Real content: shafts P4 and P7 of the Raschpëtzer qanat (Walferdange, Luxembourg), covered
 * together as a companion sub-article — see `./raschpetzer.ts`'s header for the source repo
 * (`raschpetzer-model-digital-3d`: `data/shafts.json`, `docs/RASCHPETZER_DATA.md`) and the
 * primary-source brochure it cites (vendored at `static/sources/`). P4 (no minus) is a
 * distinct shaft from the already-covered P-4 (see `./raschpetzer-shaft-p-4.ts`) — P4 sits on
 * the eastern leg of the route, P-4 on the western leg. Every specific fact/number carries its
 * own adjacent citation. Page locators come from `data/shafts.json`'s per-field `_prov.loc`
 * entries for the "P4" and "P7" records.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's/mock.ts's tiny inline-run authoring helpers — kept
// separate (not imported from either) so this module has no circular dependency on them.
const t = (text: string): TextRun => ({ text })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Static-asset paths need the GitHub Pages project-subpath base prefixed by hand — see
 *  raschpetzer.ts's `asset()` for the full rationale (works locally, 404s in prod otherwise
 *  without it). */
const asset = (path: string): string => `${base}${path}`

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `_prov.loc` fields for
// the "P4" and "P7" shaft records / docs/RASCHPETZER_DATA.md's "Shaft notes" — plain
// page/#page anchors into the vendored PDF, opened new tab (same pattern as raschpetzer.ts's
// `c` / raschpetzer-shafts.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	overview: {
		id: 'c-shaft-p4-p7-overview',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 4, shaft count and depth range)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=4`,
	},
	p4: {
		id: 'c-shaft-p4-p7-p4',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 18 — shaft P4: position, joint excavation with P5, concrete cap, and the later tunnel linking P5–P3)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=18`,
	},
	p7location: {
		id: 'c-shaft-p4-p7-p7-location',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 19 — shaft P7: located from below ground, cleared with heavy machinery)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=19`,
	},
	p7counterExcavation: {
		id: 'c-shaft-p4-p7-p7-counter',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 26 — counter-excavation between shafts P7 and P8)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=26`,
	},
} satisfies Record<string, Citation>

export const shaftP4P7Citations = c

export const shaftP4P7Article: Article = {
	id: 'a-shaft-p4-p7',
	slug: 'shaft-p4-p7',
	locale: 'en',
	title: 'Shafts P4 and P7',
	summary:
		"P4 and P7 are two of the main-line access shafts of the Raschpëtzer qanat's eastern leg: P4 was later tunnelled through at its base to link the P5–P3 stretch of gallery, while P7 was located from below ground and connected to P8 by counter-excavation.",
	categories: ['archaeology'],
	infobox: [
		{ label: 'Shaft', value: 'P4' },
		{ label: 'Role', value: 'Main-line' },
		{ label: 'Surface treatment', value: 'Concrete rings and slab cap' },
		{ label: 'Shaft', value: 'P7' },
		{ label: 'Role', value: 'Main-line' },
		{ label: 'Surface treatment', value: 'Metal lid' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('P4 and P7 are two of the main-line access shafts of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					" qanat's eastern leg, described together here for how each was connected to its neighbours: ",
				),
				cite(
					'both are counted among the thirteen shafts documented along the route,',
					'c-shaft-p4-p7-overview',
				),
				t(
					" see the full inventory in the companion article on the qanat's shafts for depths, floor elevations, and the shaft line as a whole.",
				),
			),
		},
		{ id: 'h-p4', type: 'heading', level: 2, text: 'P4 — linking the P5–P3 stretch' },
		{
			id: 'p-p4',
			type: 'paragraph',
			runs: p(
				t('P4 lies '),
				cite('half-way between shafts P3 and P5', 'c-shaft-p4-p7-p4'),
				t(', and its mouth was '),
				cite(
					'first excavated together with P5, in the same phase of fieldwork.',
					'c-shaft-p4-p7-p4',
				),
				t(' At the surface, the shaft head was finished with '),
				cite('precast concrete rings topped by a concrete slab cap.', 'c-shaft-p4-p7-p4'),
				t(
					" P4's base, though, was only joined to the rest of the gallery later: once the neighbouring shafts P5 and P3 had themselves been excavated, a further phase of work ",
				),
				cite('tunnelled through from P4 to link P5 and P3', 'c-shaft-p4-p7-p4'),
				t(
					" — that is, crews drove a connecting tunnel between P4's base and the gallery sections already opened at P5 and P3, joining what had been separate excavated stretches into one continuous passage, rather than completing each shaft's section of gallery in isolation.",
				),
			),
		},
		{
			id: 'h-p7',
			type: 'heading',
			level: 2,
			text: 'P7 — surveyed from underground, counter-excavated to P8',
		},
		{
			id: 'p-p7',
			type: 'paragraph',
			runs: p(
				t('P7 was not fixed at the surface first. Instead it was '),
				cite(
					'located from below ground, along the eastbound gallery — surveyors traced the route underground and identified where the shaft head should be before any digging began there from above.',
					'c-shaft-p4-p7-p7-location',
				),
				t(' Once found, the shaft itself was '),
				cite('cleared with heavy machinery', 'c-shaft-p4-p7-p7-location'),
				t(
					' rather than by hand. The connecting stretch between P7 and P8 was then dug by ',
				),
				cite('counter-excavation', 'c-shaft-p4-p7-p7-counter'),
				t(
					' — crews working simultaneously from both P7 and P8, digging toward each other underground so the two headings met somewhere in the middle, rather than one crew tunnelling the whole distance from a single end.',
				),
			),
		},
	],
	citations: [c.overview, c.p4, c.p7location, c.p7counterExcavation],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary:
				'Initial draft from the site SSOT dataset (data/shafts.json) and the 2018 brochure',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

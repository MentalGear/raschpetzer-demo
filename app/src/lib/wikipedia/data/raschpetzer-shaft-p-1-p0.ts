/**
 * Real content: shafts P-1 and P0 of the Raschpëtzer qanat (Walferdange, Luxembourg) — two
 * adjacent, lightly documented shafts on the western leg of the route, between shaft P-4 and
 * shaft P1. A companion sub-article to `./raschpetzer.ts` and `./raschpetzer-shafts.ts` — see
 * `raschpetzer.ts`'s header for the source repo (`raschpetzer-model-digital-3d`:
 * `data/shafts.json`, `docs/RASCHPETZER_DATA.md`) and the primary-source brochure it cites
 * (vendored at `static/sources/`). Every specific fact carries its own adjacent citation. Page
 * locators come from `data/shafts.json`'s `_prov.notes.loc` for both shafts (p.20), matching
 * `docs/RASCHPETZER_DATA.md`'s "Shaft notes" entries for P-1 and P0.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's/raschpetzer-shafts.ts's tiny inline-run authoring helpers —
// kept separate (not imported from either) so this module has no circular dependency on them.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
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

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `_prov.notes.loc` fields
// (both p.20) / docs/RASCHPETZER_DATA.md's "Shaft notes" — plain page/#page anchors into the
// vendored PDF, opened new tab (same pattern as raschpetzer.ts's/raschpetzer-shafts.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	construction: {
		id: 'c-shaft-p-1-p0-construction',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20 — shaft P-1: marl, sand-filled, concrete segments)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
	status: {
		id: 'c-shaft-p-1-p0-status',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20 — shaft P0: surface panel only, not excavated)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
	/** The companion 3D model's own established citation for this fix — an unpublished
	 *  working document, not redistributed here, so no `url` (same pattern as
	 *  `raschpetzer-gallery.ts`'s `c-gallery-survey-outlet`). */
	wernerSitSurvey: {
		id: 'c-shaft-p-1-p0-werner-sit-survey',
		title: 'Coordonnées Raschpëtzer — surveyed shaft coordinates, LUREF/LTM (EPSG:2169)',
		authors: 'Werner, Henri',
		publisher:
			'Companion GIS/3D model dataset (data/shafts.json, docs/DATA_CREDIBILITY.md) — provided directly by Henri Werner, who is not necessarily the original surveying party',
	},
} satisfies Record<string, Citation>

export const shaftPMinus1P0Citations = c

export const shaftPMinus1P0Article: Article = {
	id: 'a-shaft-p-1-p0',
	slug: 'shaft-p-1-p0',
	locale: 'en',
	title: 'Shafts P-1 and P0',
	summary:
		'P-1 and P0 are two adjacent shafts on the western leg of the Raschpëtzer qanat, between shafts P-4 and P1 — P-1 a sand-filled shaft secured with concrete segments and not used for access, P0 a known shaft position marked only by a surface panel and never excavated.',
	categories: ['archaeology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t(
					'P-1 and P0 are two adjacent, lightly documented shafts on the western leg of the ',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					" qanat's route, between shaft P-4 and shaft P1. Unlike most of the route's shafts, neither is a normal open access point today: P-1 was closed off after excavation, and P0 has never been dug at all. This is a companion sub-article to ",
				),
				link('Shafts of the Raschpëtzer', 'raschpetzer-shafts'),
				t(", covering both in more detail than that article's summary table."),
			),
		},
		{ id: 'h-p-1', type: 'heading', level: 2, text: 'P-1 — a sand-filled shaft in marl' },
		{
			id: 'p-p-1',
			type: 'paragraph',
			runs: p(
				b('P-1'),
				t(' is a '),
				cite(
					'circular shaft cut through marl and found sand-filled; it was secured with concrete segments',
					'c-shaft-p-1-p0-construction',
				),
				t(
					' rather than left open like most of the route. As a result, unlike the ten shafts elsewhere along the qanat that remain accessible at the surface, ',
				),
				cite('P-1 is not used for access', 'c-shaft-p-1-p0-construction'),
				t(' today — its depth and floor elevation are unrecorded.'),
			),
		},
		{ id: 'h-p0', type: 'heading', level: 2, text: 'P0 — marked, not excavated' },
		{
			id: 'p-p0',
			type: 'paragraph',
			runs: p(
				b('P0'),
				t(', the next shaft east of P-1 along the same stretch of route, is '),
				cite(
					'marked only with a surface panel and has not been excavated',
					'c-shaft-p-1-p0-status',
				),
				t(
					' — so, unlike P-1, nothing is recorded of its depth, profile, or lining. A known shaft position can be left unexcavated for reasons that have nothing to do with doubt about its existence: digging out a shaft is expensive and disruptive to the site, and a location that is already confidently placed — here, from the regular spacing of the shafts on either side of it — can be recorded and protected at the surface without disturbing what lies underneath. A panel marking the spot lets the position stand as documented ',
				),
				link('for future fieldwork', 'raschpetzer-shafts'),
				t(
					', the same logic that leaves the route’s postulated shafts further west unexcavated.',
				),
			),
		},
		{
			id: 'h-position-proposal',
			type: 'heading',
			level: 2,
			text: 'Position: resolved via field survey (updated 20 July 2026)',
		},
		{
			id: 'p-position-proposal',
			type: 'paragraph',
			runs: p(
				t(
					'Like most of the route, neither shaft originally had a position read from a real survey grid — the 2018 brochure carries no coordinate grid on any figure, so the site’s 3D model plotted a provisional, OpenStreetMap-derived coordinate for both. Since 20 July 2026, ',
				),
				cite(
					'a real field-survey coordinate table for the main-line shafts — provided directly to the companion 3D model by Henri Werner, who sent the files but is not necessarily the original surveying party — has superseded that guess for P-1 and P0, moving each by roughly 2–3 metres',
					'c-shaft-p-1-p0-werner-sit-survey',
				),
				t(
					'. Both are marked as approximate surface markings rather than centrepoint surveys in that table, consistent with P-1 being sand-filled and P0 never excavated. A separate re-measurement of the same western shafts, supplied independently around the same time, gives P-1 a position within 0.3 metres of the now-adopted survey figure — a real cross-check corroborating it, not a competing claim.',
				),
			),
		},
	],
	citations: [c.construction, c.status, c.wernerSitSurvey],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary:
				'Initial draft from the site SSOT dataset (data/shafts.json) and the 2018 brochure',
			blocks: [],
		},
		{
			id: 'r2',
			author: 'user-supplied',
			ts: Date.UTC(2026, 6, 22),
			summary:
				'Added Henri Werner’s separately-supplied 1997-plan LUREF re-measurement, cross-checked against Guy Waringo’s figures for P0/P1',
			blocks: [],
		},
		{
			id: 'r3',
			author: 'user-supplied',
			ts: Date.UTC(2026, 6, 23),
			summary:
				'Corrected: the companion 3D model had already resolved P-1/P0’s position on 20 July 2026 via a real field-survey table; also fixed a mistaken ~6 m P-1 discrepancy claim in r2, caused by misreading a handwritten table — the actual figures agree within 0.3 m',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 23),
	contributors: ['raschpetzer-model-digital-3d SSOT', 'user-supplied'],
}

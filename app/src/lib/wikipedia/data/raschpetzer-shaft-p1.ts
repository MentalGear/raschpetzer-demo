/**
 * Real content: a standalone deep-dive on shaft P1 of the Raschpëtzer qanat (Walferdange,
 * Luxembourg) — a companion sub-article to `./raschpetzer.ts` and `./raschpetzer-shafts.ts`.
 * See `raschpetzer.ts`'s header for the source repo (`raschpetzer-model-digital-3d`:
 * `data/shafts.json`'s "P1" record, `docs/RASCHPETZER_DATA.md`) and the primary-source
 * brochure it cites (vendored at `static/sources/`). Every specific fact/number carries its
 * own adjacent citation. Page locators come from `data/shafts.json`'s `P1._prov.loc` field
 * (p. 16) and `docs/RASCHPETZER_DATA.md`'s "Shaft notes" list.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's/raschpetzer-shafts.ts's/mock.ts's tiny inline-run
// authoring helpers — kept separate (not imported from any of them) so this module has no
// circular dependency on them.
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

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `P1._prov.loc` field /
// docs/RASCHPETZER_DATA.md's "Shaft notes" — plain page/#page anchors into the vendored PDF,
// opened new tab (same pattern as raschpetzer.ts's/raschpetzer-shafts.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	depthAndPosition: {
		id: 'c-shaft-p1-p16-depth',
		title:
			'The Raschpëtzer — A Roman Underground Water Supply System (p. 16 — shaft P1 depth, position, and sounding gallery)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=16`,
	},
	firstAttempt: {
		id: 'c-shaft-p1-p11',
		title:
			'The Raschpëtzer — A Roman Underground Water Supply System (p. 11 — 1913 initial excavation attempt)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=11`,
	},
	p2Proximity: {
		id: 'c-shaft-p1-p17',
		title:
			'The Raschpëtzer — A Roman Underground Water Supply System (p. 17 — shaft P2, unusually close to P1)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=17`,
	},
} satisfies Record<string, Citation>

export const shaftP1Citations = c

export const shaftP1Article: Article = {
	id: 'a-shaft-p1',
	slug: 'shaft-p1',
	locale: 'en',
	title: 'Shaft P1',
	summary:
		"Shaft P1 of the Raschpëtzer qanat sits at the bend in the route, sunk 30 metres through a natural depression 6 metres below the Pëtschend plateau edge — on present evidence, likely the first shaft the Roman builders sank, and the point from which an intermediate 'sounding' gallery was dug 20 metres down to test the ground before the final channel was cut.",
	categories: ['archaeology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				b('P1'),
				t(' is a shaft of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					', a Gallo-Roman qanat near Walferdange, Luxembourg. It lies on the main line of the ',
				),
				link('shaft inventory', 'raschpetzer-shafts'),
				cite(', at the bend where the route changes direction,', 'c-shaft-p1-p16-depth'),
				cite(
					' sunk 30 metres deep — one of the deepest shafts on the whole route.',
					'c-shaft-p1-p16-depth',
				),
			),
		},
		{ id: 'h-position', type: 'heading', level: 2, text: 'Position: the bend and the depression' },
		{
			id: 'p-position',
			type: 'paragraph',
			runs: p(
				t('P1 marks the point where the qanat route changes direction — '),
				cite('the bend in the line', 'c-shaft-p1-p16-depth'),
				t(
					' — and its head sits in a natural depression in the ground surface, its mouth ',
				),
				cite(
					'6 metres below the edge of the Pëtschend plateau,',
					'c-shaft-p1-p16-depth',
				),
				t(
					' rather than flush with the plateau surface itself. That depression would have made the shaft head easier to locate and dig into from the surface than a spot on level, undisturbed ground — a plausible practical reason a builder scouting the route might have chosen to start there.',
				),
			),
		},
		{ id: 'h-first-shaft', type: 'heading', level: 2, text: 'Likely the first shaft sunk' },
		{
			id: 'p-first-shaft',
			type: 'paragraph',
			runs: p(
				cite(
					'On present evidence P1 is thought to be the first shaft the Roman builders sank',
					'c-shaft-p1-p16-depth',
				),
				t(
					' along the route — a working hypothesis drawn from its position at the bend and the natural depression that would have marked out the spot, rather than from a dated find at the shaft itself (the dendrochronology that anchors the qanat\'s construction date instead comes from an oak beam at shaft P8; see the ',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(" article's Dating section)."),
			),
		},
		{
			id: 'p-first-attempt',
			type: 'paragraph',
			runs: p(
				t(
					'P1 also has a modern-excavation distinction: it was one of the shafts cleared during ',
				),
				cite(
					"the initial 1913 excavation attempt at the site — the attempt that, at the time, found nothing conclusive; the qanat gallery itself wasn't uncovered until systematic excavation resumed in 1967 and reached it in 1986",
					'c-shaft-p1-p11',
				),
				t(
					'. Today its head is capped with a metal lid, one of the ten excavated shafts accessible at the surface.',
				),
			),
		},
		{ id: 'h-sounding', type: 'heading', level: 2, text: "The intermediate 'sounding' gallery" },
		{
			id: 'p-sounding',
			type: 'paragraph',
			runs: p(
				cite(
					"At an intermediate depth of 20 metres, P1 has a short 'sounding' gallery cut off to the side — one with no channel of its own,",
					'c-shaft-p1-p16-depth',
				),
				t(
					' distinct from the finished water channel that runs along the floor of the qanat\'s main gallery, 10 metres further down at the shaft\'s full 30-metre depth.',
				),
			),
		},
		{
			id: 'callout-sounding',
			type: 'callout',
			variant: 'info',
			title: "What is a 'sounding' gallery?",
			runs: p(
				t(
					'A sounding gallery is an exploratory dig, not part of the finished qanat. Roman surveyors could set a shaft\'s planned depth and a gallery\'s intended gradient from the surface, but they could not see the rock and soil in between. A short side-gallery driven out partway down a shaft let diggers test the ground — checking the strata, feeling for water, gauging how workable the rock was — before committing to the final depth and line. If the sounding didn\'t hit what the builders needed, the shaft continued deeper (as P1\'s did, another 10 m past the 20 m sounding) rather than following the exploratory cut. That is why a sounding gallery, unlike the main channel, carries no water conduit: it was never meant to.',
				),
			),
		},
		{ id: 'h-see-also', type: 'heading', level: 2, text: 'See also' },
		{
			id: 'p-see-also',
			type: 'paragraph',
			runs: p(
				t('For the qanat as a whole, see the '),
				link('Raschpëtzer Qanat', 'raschpetzer-qanat'),
				t(' article; for the full shaft-by-shaft inventory, including P1\'s neighbours P0 and '),
				cite(
					"P2 — unusually close to P1, for survey reasons —",
					'c-shaft-p1-p17',
				),
				t(', see '),
				link('Shafts of the Raschpëtzer', 'raschpetzer-shafts'),
				t('.'),
			),
		},
	],
	citations: [c.depthAndPosition, c.firstAttempt, c.p2Proximity],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary: 'Initial draft from the site SSOT dataset (data/shafts.json) and the 2018 brochure',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

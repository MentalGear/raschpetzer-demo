/**
 * Real content: a standalone deep-dive on shaft P6 of the Raschpëtzer qanat (Walferdange,
 * Luxembourg) — the first shaft of the Haedchen depression leg. Sourced from the companion
 * data repo `raschpetzer-model-digital-3d` (`data/shafts.json`'s "P6" record,
 * `docs/RASCHPETZER_DATA.md`'s "Shaft notes" and "Gallery & channel" sections) and the
 * primary-source brochure it cites (vendored at `static/sources/`). Every specific
 * fact/number carries its own adjacent citation. Page locators come from `data/shafts.json`'s
 * P6 `_prov.notes.loc` ("p.18-19; p.26-27; fig.5-5") and the matching stepped-fall citation
 * already used by `raschpetzer-gallery.ts`'s `c.gradient` (page 26) — this article covers P6
 * itself and cross-links to that sibling article for the stepped-fall engineering detail
 * rather than repeating it at length.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's/mock.ts's tiny inline-run authoring helpers — kept
// separate (not imported from either) so this module has no circular dependency on them.
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

// Page locators per raschpetzer-model-digital-3d's data/shafts.json P6 `_prov.notes.loc`
// ("p.18-19; p.26-27; fig.5-5") / docs/RASCHPETZER_DATA.md's "Shaft notes" and "Gallery &
// channel" sections — plain page/#page anchors into the vendored PDF, opened new tab (same
// pattern as raschpetzer.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	context: {
		id: 'c-shaft-p6-context',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 18, the Haedchen depression and shaft P6)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=18`,
	},
	survey: {
		id: 'c-shaft-p6-survey',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 18, shaft P6 surveyed from below ground)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=18`,
	},
	debrisCone: {
		id: 'c-shaft-p6-debris',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 19, sinter/debris cone and rock bed depth at P6)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=19`,
	},
	steppedFall: {
		id: 'c-shaft-p6-stepped-fall',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 26, the stepped fall in the gallery beneath P6)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=26`,
	},
} satisfies Record<string, Citation>

export const shaftP6Citations = c

export const shaftP6Article: Article = {
	id: 'a-shaft-p6',
	slug: 'shaft-p6',
	locale: 'en',
	title: 'Shaft P6',
	summary:
		'Shaft P6 of the Raschpëtzer qanat is the first shaft of the Haedchen depression leg, surveyed from inside the gallery rather than sunk from the surface, and marked below ground by an iron-oxide-stained sinter and debris cone where the gallery meets a 1.2-metre stepped fall.',
	categories: ['archaeology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('Shaft '),
				b('P6'),
				t(' is one of the vertical access shafts of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(' qanat, listed among the route’s '),
				link('shafts', 'raschpetzer-shafts'),
				t(
					' as the twelfth in the west-to-east sequence. It sits just east of the deepest shaft, P5, at the point where the route drops off the eastern edge of the Pëtschend plateau',
				),
				cite(' into the Haedchen depression', 'c-shaft-p6-context'),
				t('.'),
			),
		},
		{ id: 'h-haedchen', type: 'heading', level: 2, text: 'Entering the Haedchen depression' },
		{
			id: 'p-haedchen',
			type: 'paragraph',
			runs: p(
				b('P6'),
				cite(
					' is the first shaft of the Haedchen depression leg of the route — the low ground east of the Pëtschend plateau that the gallery drops sharply into after P5',
					'c-shaft-p6-context',
				),
				t(
					', so it marks a geological as well as a topographic transition: the gallery here leaves the solid rock it was cut through on the plateau and enters ground that needed a different construction approach.',
				),
			),
		},
		{ id: 'h-survey', type: 'heading', level: 2, text: 'Surveyed from below ground' },
		{
			id: 'p-survey',
			type: 'paragraph',
			runs: p(
				t('Unlike shafts sunk from the surface and cleared downward, '),
				cite(
					'P6 was located and surveyed from inside the gallery, working upward from below ground rather than digging down to meet it',
					'c-shaft-p6-survey',
				),
				t(
					' — a method the excavators used at several shafts on this eastern leg once the gallery itself had been traced, letting them find and confirm a shaft head from underneath before opening it at the surface.',
				),
			),
		},
		{ id: 'h-debris', type: 'heading', level: 2, text: 'Debris and sinter cone' },
		{
			id: 'p-debris',
			type: 'paragraph',
			runs: p(
				cite(
					'At the base of P6 the gallery preserves a debris and sinter cone stained with iron oxide',
					'c-shaft-p6-debris',
				),
				t(
					' — mineral deposits and fallen material built up beneath the shaft mouth over time. ',
				),
				cite(
					'The solid rock bed here lies roughly 10 metres down, beneath about 10 metres of soft overlying ground',
					'c-shaft-p6-debris',
				),
				t(
					', a considerably deeper overburden than the shafts back on the plateau, consistent with P6’s position at the start of the softer-ground Haedchen leg.',
				),
			),
		},
		{ id: 'h-stepped-fall', type: 'heading', level: 2, text: 'The stepped fall beneath P6' },
		{
			id: 'p-stepped-fall',
			type: 'paragraph',
			runs: p(
				t('Just below P6, the gallery makes '),
				cite(
					'one of only two deliberate departures from its otherwise near-constant 0.1% gradient: a 1.2-metre stepped fall',
					'c-shaft-p6-stepped-fall',
				),
				t(
					', built in as a level-adjustment provision for the change in ground conditions at the plateau edge. The construction of that step — and its counterpart 1.0-metre fall under shaft P4 — is covered in full in ',
				),
				link('Gallery and Channel Construction', 'raschpetzer-gallery'),
				t(
					'; this article covers the shaft itself, not the engineering of the drop below it.',
				),
			),
		},
	],
	citations: [c.context, c.survey, c.debrisCone, c.steppedFall],
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

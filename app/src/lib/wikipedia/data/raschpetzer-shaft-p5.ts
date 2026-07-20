/**
 * Real content: a standalone deep-dive on shaft P5 of the Raschpëtzer qanat (Walferdange,
 * Luxembourg) — the deepest of the 18 known/postulated shafts, at 36 m. A companion
 * sub-article to `./raschpetzer.ts` and `./raschpetzer-shafts.ts` — see `raschpetzer.ts`'s
 * header for the source repo (`raschpetzer-model-digital-3d`: `data/shafts.json`,
 * `docs/RASCHPETZER_DATA.md`) and the primary-source brochure it cites (vendored at
 * `static/sources/`). Every specific fact/number carries its own adjacent citation. Page
 * locators come from `data/shafts.json`'s `P5` (and, for the neighbouring shaft's accident,
 * `P-5`) record `_prov.loc` entries.
 *
 * Note on P5 vs. P-5: these are two distinct shafts (`data/shafts.json` `id: "P5"` and
 * `id: "P-5"` are separate records) — P5 is the deepest shaft, at the eastern edge of the
 * Pëtschend plateau; P-5 lies west of it and is where the "geological accident" happened.
 * `raschpetzer-shafts.ts`'s P5 section already draws this distinction ("West of here, at the
 * neighbouring shaft P-5, excavators recorded a 'geological accident'") — this article keeps
 * it, rather than conflating the two shafts' facts.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's/raschpetzer-shafts.ts's tiny inline-run authoring helpers
// — kept separate (not imported from either) so this module has no circular dependency on
// them.
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

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `_prov.loc` fields (the
// `P5` record for P5's own facts, the `P-5` record for the neighbouring shaft's accident) /
// docs/RASCHPETZER_DATA.md's "Shaft notes" — plain page/#page anchors into the vendored PDF,
// opened new tab (same pattern as raschpetzer.ts's/raschpetzer-shafts.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	depth: {
		id: 'c-shaft-p5-depth',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, fig. 6-7 — shaft P5 depth)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=9`,
	},
	diameter: {
		id: 'c-shaft-p5-diameter',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 18, 32 — shaft P5 diameter and torus bulges)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=18`,
	},
	cleared: {
		id: 'c-shaft-p5-cleared',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, 11–12 — P5 cleared to base, 3 Oct 1986)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=11`,
	},
	accident: {
		id: 'c-shaft-p5-accident',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20–21, 23 — the "geological accident" at neighbouring shaft P-5)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
} satisfies Record<string, Citation>

export const shaftP5Citations = c

export const shaftP5Article: Article = {
	id: 'a-shaft-p5',
	slug: 'shaft-p5',
	locale: 'en',
	title: 'Shaft P5',
	summary:
		"P5 is the deepest of the Raschpëtzer qanat's 18 known and postulated shafts, at 36 metres, sunk at the eastern edge of the Pëtschend plateau. Its shaft wall steps inward at a series of torus bulges, from 1.2 m to 0.85 m in diameter, and reaching its base on 3 October 1986 marked the rediscovery of the qanat gallery itself.",
	categories: ['archaeology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				b('P5'),
				t(' is a vertical access shaft of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					', a Gallo-Roman qanat near Walferdange, Luxembourg. Sunk at the eastern edge of the Pëtschend plateau, it is ',
				),
				cite("the deepest of the qanat's shafts at 36 metres", 'c-shaft-p5-depth'),
				t(
					', and reaching its floor in 1986 was also the moment excavators rediscovered the qanat gallery itself. It is one of eighteen shaft records catalogued along the route — see ',
				),
				link('Shafts of the Raschpëtzer', 'raschpetzer-shafts'),
				t(' for the full inventory.'),
			),
		},
		{ id: 'h-location', type: 'heading', level: 2, text: 'Location and depth' },
		{
			id: 'p-location',
			type: 'paragraph',
			runs: p(
				t('P5 sits at the '),
				b('eastern edge of the Pëtschend plateau'),
				t(
					', the highest and easternmost stretch of the main shaft line before the ground drops toward the Haedchen depression. It is ',
				),
				cite('quoted at 36 metres deep', 'c-shaft-p5-depth'),
				t('.'),
			),
		},
		{ id: 'h-construction', type: 'heading', level: 2, text: 'Torus-bulge construction' },
		{
			id: 'p-construction',
			type: 'paragraph',
			runs: p(
				t(
					"Unlike a shaft of constant diameter, P5's wall steps inward in a series of rings as it descends — what the excavation record calls ",
				),
				b('torus bulges'),
				t('. '),
				cite(
					'The diameter narrows from 1.2 metres at the top to 0.85 metres by the base',
					'c-shaft-p5-diameter',
				),
				cite(
					', and at the bottom the connecting gallery passes tangentially to the shaft rather than crossing straight through it',
					'c-shaft-p5-diameter',
				),
				t(
					" — a detail that distinguishes P5's profile from the more uniform bore of the shallower shafts along the route.",
				),
			),
		},
		{ id: 'h-discovery', type: 'heading', level: 2, text: 'Discovery' },
		{
			id: 'p-discovery',
			type: 'paragraph',
			runs: p(
				cite('P5 was first cleared to roughly 10 metres in 1913', 'c-shaft-p5-cleared'),
				t(
					', during an initial, inconclusive excavation attempt at the site. Its floor was not reached until decades later, when systematic excavation resumed: ',
				),
				cite(
					"P5's base was finally cleared on 3 October 1986 — the same day the qanat gallery itself was rediscovered",
					'c-shaft-p5-cleared',
				),
				t(
					'. That single find reopened archaeological work on the whole site and set off the excavation campaigns documented across the rest of the shaft line.',
				),
			),
		},
		{
			id: 'h-accident',
			type: 'heading',
			level: 2,
			text: 'The geological accident at neighbouring P-5',
		},
		{
			id: 'p-accident',
			type: 'paragraph',
			runs: p(
				t(
					'A separate, similarly-named shaft — P-5, west of P5 along the route — is the site of the excavation’s ',
				),
				b('"geological accident"'),
				t('. There, '),
				cite(
					'the channel floor was breached and water was lost into limestone fissures beneath it',
					'c-shaft-p5-accident',
				),
				t(', forcing '),
				cite('that stretch of channel to be rebuilt in concrete', 'c-shaft-p5-accident'),
				t(
					" rather than repaired in the original dry-masonry technique. P5 and P-5 are distinct shafts in the site record — P5 is the 36-metre shaft described above; P-5 is its western neighbour, where the accident occurred — but the two are close enough along the route, and similar enough in name, that the accident is often discussed alongside P5's own history. See ",
				),
				link('Shafts of the Raschpëtzer', 'raschpetzer-shafts'),
				t(' for the rest of the shaft line, including P-5’s own entry.'),
			),
		},
	],
	citations: [c.depth, c.diameter, c.cleared, c.accident],
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

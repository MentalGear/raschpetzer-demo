/**
 * Real content: a standalone deep-dive on shaft P-5 of the Raschpëtzer qanat (Walferdange,
 * Luxembourg) — the shaft where excavators found the channel filled with yellow sand and,
 * a few metres further down, the site of the dig's "geological accident": the channel floor
 * breached and water was lost into limestone fissures below it, forcing that stretch to be
 * rebuilt in concrete. A companion sub-article to `./raschpetzer.ts` and
 * `./raschpetzer-shafts.ts` — see `raschpetzer.ts`'s header for the source repo
 * (`raschpetzer-model-digital-3d`: `data/shafts.json`, `docs/RASCHPETZER_DATA.md`) and the
 * primary-source brochure it cites (vendored at `static/sources/`). Every specific
 * fact/number carries its own adjacent citation. Page locators come from `data/shafts.json`'s
 * "P-5" record `_prov` entries.
 *
 * Note on P-5 vs. P5: these are two distinct shafts (`data/shafts.json` `id: "P-5"` and
 * `id: "P5"` are separate records) — P-5 (this article) sits on the western leg of the route,
 * between the auxiliary shaft P-5A and shaft P-4, and is where the geological accident
 * happened; P5, without the hyphen, is the unrelated 36-metre-deep shaft at the eastern edge
 * of the Pëtschend plateau, covered in `./raschpetzer-shaft-p5.ts`. `raschpetzer-shafts.ts`'s
 * P5 section already flags the distinction ("West of here, at the neighbouring shaft P-5,
 * excavators recorded a 'geological accident'"); see `raschpetzer-shaft-p5.ts` for that
 * shaft's own history and its brief mention of the accident for contrast.
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

// Page locators per raschpetzer-model-digital-3d's data/shafts.json `_prov` fields for the
// "P-5" record / docs/RASCHPETZER_DATA.md's "Shaft notes" — plain page/#page anchors into the
// vendored PDF, opened new tab (same pattern as raschpetzer.ts's/raschpetzer-shafts.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	fill: {
		id: 'c-shaft-pminus5-fill',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20–21 — shaft P-5 backfilled in yellow sand; channel found at 10 m)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
	accident: {
		id: 'c-shaft-pminus5-accident',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 20–21 — the "geological accident" at shaft P-5: channel floor breached, water lost into limestone fissures)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=20`,
	},
	repair: {
		id: 'c-shaft-pminus5-repair',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 23 — the breached stretch of channel rebuilt in concrete)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=23`,
	},
	dating: {
		id: 'c-shaft-pminus5-dating',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 12, fig. 3-1 — western continuation campaign, 1992–2000)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=12`,
	},
} satisfies Record<string, Citation>

export const raschpetzerShaftPMinus5Citations = c

export const shaftPMinus5Article: Article = {
	id: 'a-shaft-p-5',
	slug: 'shaft-p-5',
	locale: 'en',
	title: 'Shaft P-5',
	summary:
		"Shaft P-5 is one of the vertical access shafts of the Raschpëtzer qanat, on the western leg of the route between the auxiliary shaft P-5A and shaft P-4. Excavators found its channel backfilled with yellow sand, and a stretch of gallery near it as the site of the dig's \"geological accident,\" where the channel floor was breached and water was lost into limestone fissures below — repaired by rebuilding that section of channel in concrete rather than the original dry-masonry technique.",
	categories: ['archaeology'],
	infobox: [
		{ label: 'Site', value: 'Raschpëtzer qanat, Helmsange Forest, Walferdange, Luxembourg' },
		{ label: 'Role', value: 'Main-line vertical access shaft' },
		{ label: 'Position', value: 'Western leg, between P-5A and P-4' },
		{ label: 'Fill', value: 'Yellow sand' },
		{ label: 'Channel found at', value: '10 m' },
		{ label: 'Notable for', value: "The dig's \"geological accident\" and its concrete repair" },
		{ label: 'Excavated', value: '1993 (western continuation campaign, 1992–2000)' },
		{ label: 'Surface today', value: 'Metal lid' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				b('P-5'),
				t(' is one of the vertical access shafts of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					', on the western leg of the route, sunk between the auxiliary shaft P-5A and shaft P-4 (see the full ',
				),
				link('shaft inventory', 'raschpetzer-shafts'),
				t(
					' for its neighbours). Excavators found its channel backfilled with yellow sand, and it is best known as the site of the dig\'s ',
				),
				b('"geological accident"'),
				t(
					', where a breach in the channel floor let water escape into the fissured limestone beneath it.',
				),
			),
		},
		{ id: 'h-fill', type: 'heading', level: 2, text: 'The sand fill' },
		{
			id: 'p-fill',
			type: 'paragraph',
			runs: p(
				t('Like several of the qanat\'s shafts, P-5 was found '),
				cite('backfilled with yellow sand', 'c-shaft-pminus5-fill'),
				t(
					' rather than the natural rubble and soil that filled other shafts along the route — sediment that had to be cleared out before excavators could reach the gallery floor. ',
				),
				cite('The channel itself was found at a depth of 10 metres', 'c-shaft-pminus5-fill'),
				t(', below the sand fill.'),
			),
		},
		{ id: 'h-accident', type: 'heading', level: 2, text: 'The geological accident' },
		{
			id: 'p-accident',
			type: 'paragraph',
			runs: p(
				t('P-5 is the site of what the excavation record calls the dig\'s '),
				b('"geological accident"'),
				t(': at this stretch of the channel, '),
				cite(
					'the channel floor was breached and water was lost into limestone fissures beneath it',
					'c-shaft-pminus5-accident',
				),
				t(
					' — a fissured layer in the underlying marl-and-limestone beds that the channel floor should have sealed against, but did not, at this point along the route. The result was a section of gallery that could no longer hold water: instead of flowing on toward the settlement it supplied, water draining through the breach was simply lost into the bedrock below.',
				),
			),
		},
		{ id: 'h-repair', type: 'heading', level: 2, text: 'The concrete repair' },
		{
			id: 'p-repair',
			type: 'paragraph',
			runs: p(
				t(
					'Everywhere else along its route, the qanat channel is lined and floored in dry masonry, without mortar. At P-5, that technique could not be made watertight against the fissured rock beneath the breach, so '
				),
				cite(
					'the affected stretch of channel was rebuilt in concrete instead',
					'c-shaft-pminus5-repair',
				),
				t(
					', sealing the floor against the fissures and restoring the gallery\'s gravity flow past the accident site. The concrete repair remains a visibly distinct patch in an otherwise uniformly dry-stone conduit — physical evidence, still in place, of a construction problem the original Roman builders had to solve on-site.',
				),
			),
		},
		{ id: 'h-excavation', type: 'heading', level: 2, text: 'Excavation' },
		{
			id: 'p-excavation',
			type: 'paragraph',
			runs: p(
				cite(
					'P-5 was reached during the western-continuation campaign that ran from 1992 to 2000,',
					'c-shaft-pminus5-dating',
				),
				t(
					' extending the excavated gallery further west from the shafts already opened in the 1986 rediscovery. Today its head is capped with a metal lid, one of the ten excavated shafts along the route with a modern surface cover.',
				),
			),
		},
	],
	citations: [c.fill, c.accident, c.repair, c.dating],
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

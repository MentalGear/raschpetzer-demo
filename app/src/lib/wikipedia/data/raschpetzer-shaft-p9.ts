/**
 * Real content: a standalone deep dive on shaft P9, the Raschpëtzer qanat's "mother shaft"
 * (Walferdange, Luxembourg) — the most upstream and easternmost of the shaft line. A
 * companion sub-article to `./raschpetzer.ts` and `./raschpetzer-shafts.ts` — see
 * `raschpetzer.ts`'s header for the source repo (`raschpetzer-model-digital-3d`:
 * `data/shafts.json`, `docs/RASCHPETZER_DATA.md`) and the primary-source brochure it cites
 * (vendored at `static/sources/`). `raschpetzer-shafts.ts` covers P9 only in a brief table
 * row + one paragraph among 18 shafts; this article goes deeper on P9 alone without
 * repeating that ground. Every specific fact/number carries its own adjacent citation. Page
 * locators come from `data/shafts.json`'s P9 record `_prov.notes.loc` field
 * ("p.10; p.19; fig.5-7") and `docs/RASCHPETZER_DATA.md`'s "Shaft notes" entry for P9.
 *
 * No dedicated shovel article exists yet in this corpus (checked: no `raschpetzer-shovel.ts`
 * under `src/lib/wikipedia/data/`) — the shovel find is described briefly below and
 * cross-linked to the finds gallery in `raschpetzer.ts` instead of being re-described there.
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
 *  without it). No images live in this article, but the citation URLs below still deep-link
 *  into the vendored brochure PDF, which is itself a base-prefixed static asset. */
const asset = (path: string): string => `${base}${path}`

// Page locators per raschpetzer-model-digital-3d's data/shafts.json P9 record's
// `_prov.notes.loc` ("p.10; p.19; fig.5-7") and docs/RASCHPETZER_DATA.md's P9 shaft note —
// plain page/#page anchors into the vendored PDF, opened new tab (same pattern as
// raschpetzer.ts's/raschpetzer-shafts.ts's `c`).
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')
const c = {
	mother: {
		id: 'c-shaft-p9-p10',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 10 — shaft P9, the "mother shaft": portal niche, seepage gutter, oak shovels)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=10`,
	},
	terminus: {
		id: 'c-shaft-p9-p19',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 19, fig. 5-7 — gallery beyond P9 and the unchannelled final stretch)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=19`,
	},
	dating: {
		id: 'c-shaft-p9-p29',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 29, dendrochronology — construction phase)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=29`,
	},
} satisfies Record<string, Citation>

export const shaftP9Citations = c

export const shaftP9Article: Article = {
	id: 'a-shaft-p9',
	slug: 'shaft-p9',
	locale: 'en',
	title: 'Shaft P9',
	summary:
		'A deep dive on shaft P9, the Raschpëtzer qanat\'s "mother shaft" — the most upstream and easternmost shaft on the route, where the excavated gallery reaches its head: a portal niche with a seepage gutter, the oak shovels recovered from the surrounding mud, and the unchannelled final stretch leading up to it.',
	categories: ['archaeology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('Shaft '),
				b('P9'),
				t(' is the most upstream and easternmost shaft of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(" — the qanat's "),
				cite("'mother shaft'", 'c-shaft-p9-p10'),
				t(', where the excavated gallery reaches its head. See '),
				link('Shafts of the Raschpëtzer', 'raschpetzer-shafts'),
				t(' for the full inventory of shafts along the route.'),
			),
		},
		{ id: 'h-origin', type: 'heading', level: 2, text: "The qanat's origin point" },
		{
			id: 'p-origin',
			type: 'paragraph',
			runs: p(
				cite(
					'The excavated gallery continues only about 6 metres further east of P9 before ending',
					'c-shaft-p9-p19',
				),
				t(
					' — so, for practical purposes, P9 marks the upstream source end of the conduit as currently explored. Numbering along the route runs west to east from the auxiliary drop-shaft ',
				),
				link('P-7A', 'raschpetzer-shafts'),
				t(' to P9, and P9 sits at the far, uphill end of that line — hence the epithet '),
				cite("'mother shaft'", 'c-shaft-p9-p10'),
				t('.'),
			),
		},
		{ id: 'h-portal', type: 'heading', level: 2, text: 'Portal niche and seepage gutter' },
		{
			id: 'p-portal',
			type: 'paragraph',
			runs: p(
				cite(
					'At the base of the shaft, excavators uncovered a portal niche fitted with a seepage gutter',
					'c-shaft-p9-p10',
				),
				t(
					' — a small carved recess with a channel to carry off groundwater, built at what was, for the original diggers, the starting point of the gallery.',
				),
			),
		},
		{
			id: 'h-unfinished',
			type: 'heading',
			level: 2,
			text: 'The unchannelled final stretch',
		},
		{
			id: 'p-unfinished',
			type: 'paragraph',
			runs: p(
				cite(
					'No channel was ever cut for roughly the first 13 metres approaching P9',
					'c-shaft-p9-p19',
				),
				t(
					' — a gap consistent with how a qanat like this was typically built: the head shaft was sunk first to locate and verify the water table at the top of the intended route, with the connecting gallery then driven onward from it. At P9, that follow-up excavation of the channel apparently never reached all the way to the shaft itself, leaving its final approach — and the roughly 6 m of gallery beyond it — without a finished, stone-covered water channel.',
				),
			),
		},
		{ id: 'h-shovels', type: 'heading', level: 2, text: 'The oak shovels' },
		{
			id: 'p-shovels',
			type: 'paragraph',
			runs: p(
				cite(
					'Preserved in the mud surrounding the portal niche, excavators recovered oak shovels likely used to dig the gallery itself',
					'c-shaft-p9-p10',
				),
				t(
					' — rare organic tools that survived from the construction work because the waterlogged, low-oxygen mud kept the wood from rotting away. See the finds gallery in the ',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(' article for photographs of the shovel.'),
			),
		},
		{ id: 'h-dating', type: 'heading', level: 2, text: 'Dating' },
		{
			id: 'p-dating',
			type: 'paragraph',
			runs: p(
				t('No dated timber has been recovered from P9 itself — the qanat is dated '),
				cite(
					'from an oak beam found near shaft P8, whose outer growth ring gave a felling date around AD 131',
					'c-shaft-p9-p29',
				),
				t(
					'. As the head shaft of the same system, P9 is presumed to belong to that same early-to-mid 2nd-century construction phase. See the ',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t("'s Dating section for the dendrochronology itself."),
			),
		},
	],
	citations: [c.mother, c.terminus, c.dating],
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

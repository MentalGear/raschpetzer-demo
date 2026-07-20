/**
 * Real content: the Alzette — the river whose valley the Raschpëtzer qanat carried its water
 * toward (see `raschpetzer.ts`'s intro and `raschpetzer-walferdange.ts`'s "The Alzette valley"
 * section). An `Entity` stub for the Alzette already exists in `raschpetzer-walferdange.ts`
 * (`walferdangeEntities`, slug `alzette`) for hover-preview cards; this module is the full
 * `Article` that stub links through to — same slug, by design, so both coexist (Entity =
 * hover-preview metadata, Article = the actual page). General river facts are sourced from
 * Wikipedia and Britannica via web search; the qanat-flow-direction fact reuses the same
 * primary-source brochure page `raschpetzer.ts`/`raschpetzer-walferdange.ts` already cite.
 * Every specific fact carries its own adjacent citation.
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not imported
// from ./mock) so this module has no circular dependency on it; mock.ts is the one that
// imports articles/categories FROM here (and from the sibling raschpetzer-* modules) to
// append to its exported corpus.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Static-asset paths aren't rewritten by SvelteKit's router the way `href`/`goto`
 *  targets are (see `$lib/paths`'s `href`) — a citation `url` literal needs the GitHub
 *  Pages project-subpath base prefixed by hand, or it 404s under a non-root `BASE_PATH`
 *  deploy (works locally where `base` is `''`, breaks in prod otherwise). */
const asset = (path: string): string => `${base}${path}`

// Same vendored brochure PDF `raschpetzer.ts`/`raschpetzer-walferdange.ts` cite, page 9
// (flow direction toward the Alzette valley) — reused here for the qanat-destination fact.
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')

const c = {
	wikipedia: {
		id: 'c-alzette-wikipedia-alzette',
		title: 'Alzette',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Alzette',
	},
	britannica: {
		id: 'c-alzette-britannica',
		title: 'Alzette River',
		publisher: 'Encyclopædia Britannica',
		url: 'https://www.britannica.com/place/Alzette-River',
	},
	minett: {
		id: 'c-alzette-visitluxembourg-minett',
		title: 'Minett: the Land of the Red Rocks',
		publisher: 'Visit Luxembourg (official tourism board)',
		url: 'https://www.visitluxembourg.com/destinations/regions/minett',
	},
	brochureFlow: {
		id: 'c-alzette-brochure-p9',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 9, flow direction toward the Alzette valley)',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=9`,
	},
} satisfies Record<string, Citation>

export const alzetteCitations = c

export const alzetteArticle: Article = {
	id: 'a-alzette',
	slug: 'alzette',
	locale: 'en',
	title: 'Alzette',
	summary:
		'The Alzette is a 73-kilometre river rising near Villerupt in northeastern France and flowing north through Esch-sur-Alzette, Luxembourg City, and Mersch before joining the Sauer near Ettelbruck. Its valley was the destination the Raschpëtzer qanat was engineered to reach, carrying spring water from the Pëtschend plateau down to a Roman-era settlement on its banks.',
	categories: ['history'],
	infobox: [
		{ label: 'Length', value: '73 km (45 mi)' },
		{
			label: 'Source',
			value: 'Near Thil / Villerupt, Meurthe-et-Moselle, France (≈305 m elevation)',
		},
		{ label: 'Mouth', value: 'Sauer, near Ettelbruck, Luxembourg' },
		{ label: 'River system', value: 'Sauer → Moselle → Rhine → North Sea' },
		{ label: 'Countries', value: 'France, Luxembourg' },
		{ label: 'Major towns', value: 'Esch-sur-Alzette, Luxembourg City, Mersch' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				b('Alzette'),
				cite(
					' is a 73-kilometre river rising in Thil, near Villerupt, in the Meurthe-et-Moselle département of northeastern France, at an elevation of about 305 metres; it crosses into Luxembourg after just 2.7 kilometres.',
					'c-alzette-wikipedia-alzette',
				),
				cite(
					' It empties into the Sauer near Ettelbruck, which in turn feeds the Moselle, the Rhine, and ultimately the North Sea.',
					'c-alzette-wikipedia-alzette',
				),
			),
		},
		{ id: 'h-course', type: 'heading', level: 2, text: 'Course' },
		{
			id: 'p-course',
			type: 'paragraph',
			runs: p(
				cite(
					'From the border, the river flows north through the Luxembourgish towns of Esch-sur-Alzette, Luxembourg City, and Mersch before reaching its confluence with the Sauer.',
					'c-alzette-wikipedia-alzette',
				),
				cite(
					' In Luxembourg City it cuts deep ravines into the sandstone plateau the old town sits on; within a loop of the river stands the Bock, a rocky promontory the Romans and later the Franks fortified, and which gave its name to the Casemates du Bock tunnel network built as part of the Fortress of Luxembourg (dismantled from 1867).',
					'c-alzette-britannica',
				),
				cite(
					' The river valley forms a central axis for much of the country’s settlement and economic activity.',
					'c-alzette-britannica',
				),
			),
		},
		{ id: 'h-tributaries', type: 'heading', level: 2, text: 'Tributaries and basin' },
		{
			id: 'p-tributaries',
			type: 'paragraph',
			runs: p(
				cite(
					'Left-bank (west) tributaries include the Mess, Pétrusse, Mamer, Eisch, Attert, and Wark; right-bank (south) tributaries include the Kayl and the Dudelingerbach.',
					'c-alzette-wikipedia-alzette',
				),
				cite(
					' The Alzette basin drains most of southern Luxembourg.',
					'c-alzette-wikipedia-alzette',
				),
			),
		},
		{ id: 'h-minett', type: 'heading', level: 2, text: 'The Minett and Esch-sur-Alzette' },
		{
			id: 'p-minett',
			type: 'paragraph',
			runs: p(
				t('On the upper river, '),
				b('Esch-sur-Alzette'),
				cite(
					' grew from a village of about 1,400 people in 1842 into a town of over 30,000 by 1930 as the centre of the country’s iron and steel industry, drawing on the phosphoric iron ore of the surrounding region.',
					'c-alzette-britannica',
				),
				cite(
					' That mining region — the Minett, named for its red, iron-rich soil — was one of the cradles of the European steel industry; its former mining areas are now recognised as the Minett UNESCO Biosphere.',
					'c-alzette-visitluxembourg-minett',
				),
			),
		},
		{
			id: 'h-raschpetzer',
			type: 'heading',
			level: 2,
			text: 'The Alzette valley and the Raschpëtzer',
		},
		{
			id: 'p-raschpetzer',
			type: 'paragraph',
			runs: p(
				t('Further upstream from the modern city, near '),
				link('Walferdange', 'walferdange'),
				t(', the Alzette valley was the destination of the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(', a Roman-era qanat cut into the Pëtschend plateau above the valley.'),
				cite(
					' The gallery carried spring water east to west, against the natural dip of the surrounding strata, down toward the Alzette valley',
					'c-alzette-brochure-p9',
				),
				t(
					' — engineered, across more than a dozen shafts, specifically to reach this valley and supply a Roman-era settlement on its banks.',
				),
			),
		},
	],
	citations: [c.wikipedia, c.britannica, c.minett, c.brochureFlow],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: the Alzette river, its course, basin, and role as the Raschpëtzer’s destination valley',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

/**
 * Real content: Henri Werner, co-author of the 2018 Raschpëtzer brochure and its 2015/2017
 * predecessors, credited separately with helping build the qanat's 3D model — split out from
 * the former combined `raschpetzer-people.ts` into his own page. Citations carried over
 * verbatim from that file's verified sourcing (brochure PDF page extraction + live web search,
 * real URLs only).
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

const t = (text: string): TextRun => ({ text })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

const asset = (path: string): string => `${base}${path}`
const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')

const c = {
	brochureTitlePage: {
		id: 'c-werner-brochure-title',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (title page: authors & ISBN)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=1`,
	},
	brochureBibliography: {
		id: 'c-werner-brochure-biblio',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 38, bibliography — the same three authors’ 2015 & 2017 papers)',
		authors: 'Waringo, Guy; Faber, Sonja; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=38`,
	},
	chronicleLu: {
		id: 'c-werner-chronicle-lu',
		title: 'Archaeology in Luxembourg: Raschpëtzer Qanat',
		publisher: 'Chronicle.lu',
		url: 'https://www.chronicle.lu/category/history-archaeology/56283-archaeology-in-luxembourg-raschpetzer-qanat',
	},
} satisfies Record<string, Citation>

export const henriWernerCitations = c

export const henriWernerArticle: Article = {
	id: 'a-henri-werner',
	slug: 'henri-werner',
	locale: 'en',
	title: 'Henri Werner',
	summary:
		'Henri Werner is a co-author of the 2018 Raschpëtzer brochure, separately credited with helping build the site’s 3D model.',
	categories: ['archaeology', 'history', 'people'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				cite(
					'Henri Werner is credited as co-author of the 2018 brochure documenting the ',
					'c-werner-brochure-title',
				),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				cite(' and its 2015 and 2017 predecessors', 'c-werner-brochure-biblio'),
				t('.'),
			),
		},
		{ id: 'h-model', type: 'heading', level: 2, text: '3D model' },
		{
			id: 'p-model',
			type: 'paragraph',
			runs: p(
				cite(
					'A Chronicle.lu overview of the site separately credits "H. Werner" with helping create the qanat’s 3D model',
					'c-werner-chronicle-lu',
				),
				t(
					". He later served as president of the Syndicat d'Initiative et de Tourisme (SIT) of Walferdange for several years, succeeding ",
				),
				link('Georges Faber', 'georges-faber'),
				t(
					' in the role (editorial note: stated per project/site knowledge, not backed by a citable public source, unlike the co-authorship and 3D-model credits above). Beyond these facts, no further independently verifiable biography was found.',
				),
			),
		},
	],
	citations: [c.brochureTitlePage, c.brochureBibliography, c.chronicleLu],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary: 'Split from the combined People article into an individual page',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

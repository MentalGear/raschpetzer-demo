/**
 * Real content: the Pierre Werner Cricket Ground in Helmsange, Luxembourg — Luxembourg's
 * only regularly-used outdoor cricket venue, already briefly mentioned in the "Pierre Werner
 * Cricket Ground" section of `raschpetzer-helmsange.ts`. This article goes deeper: the
 * ground's own history and facilities, who Pierre Werner was, and its role as home to both
 * the Optimists Cricket Club and the Luxembourg national cricket team, including the 2020
 * Luxembourg T20I Trophy. Sourced from Wikipedia (EN) via web search. Every specific fact
 * carries its own adjacent citation.
 */
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not
// imported from ./mock) so this module has no circular dependency on it; mock.ts is the
// one that imports articles/categories FROM here to append to its exported corpus.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

const c = {
	wikipediaGround: {
		id: 'c-pwcg-wikipedia-ground',
		title: 'Pierre Werner Cricket Ground',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Pierre_Werner_Cricket_Ground',
	},
	wikipediaWerner: {
		id: 'c-pwcg-wikipedia-werner',
		title: 'Pierre Werner',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Pierre_Werner',
	},
} satisfies Record<string, Citation>

export const pierreWernerCricketGroundCitations = c

export const pierreWernerCricketGroundArticle: Article = {
	id: 'a-pierre-werner-cricket-ground',
	slug: 'pierre-werner-cricket-ground',
	locale: 'en',
	title: 'Pierre Werner Cricket Ground',
	summary:
		"The Pierre Werner Cricket Ground is Luxembourg's principal outdoor cricket venue, in Helmsange on the bank of the Alzette. Opened in 1991 and renamed in 2002 for former Prime Minister Pierre Werner, it is home to the Optimists Cricket Club and the Luxembourg national cricket team, and hosted the 2020 Luxembourg T20I Trophy.",
	categories: ['history'],
	infobox: [
		{ label: 'Type', value: 'Outdoor cricket ground' },
		{ label: 'Location', value: 'Rue de l’Alzette, Helmsange, Walferdange, Luxembourg' },
		{ label: 'Coordinates', value: '49.664° N, 6.128° E' },
		{ label: 'Opened', value: '1991' },
		{ label: 'Renamed', value: '2002 (for Pierre Werner)' },
		{ label: 'Capacity', value: '1,000' },
		{ label: 'Ends', value: 'Bridge End, Pavilion End' },
		{ label: 'Home teams', value: 'Optimists Cricket Club; Luxembourg national cricket team' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('The '),
				b('Pierre Werner Cricket Ground'),
				t(' is an outdoor cricket ground in '),
				link('Helmsange', 'helmsange'),
				t(', in the commune of Walferdange, Luxembourg, on rue de l’Alzette next to the '),
				link('Alzette', 'alzette'),
				t(' river.'),
				cite(
					' It is Luxembourg’s only outdoor cricket venue in regular use, with a listed capacity of 1,000.',
					'c-pwcg-wikipedia-ground',
				),
			),
		},
		{ id: 'h-history', type: 'heading', level: 2, text: 'History and facilities' },
		{
			id: 'p-history',
			type: 'paragraph',
			runs: p(
				cite(
					'The ground opened in 1991 on land donated by the commune of Walferdange, and was renamed in 2002 in honour of Pierre Werner (1913–2002), a former Prime Minister of Luxembourg and honorary president of the ground’s home club.',
					'c-pwcg-wikipedia-ground',
				),
				cite(
					' Its playing surface is artificial matting laid over concrete, and its two ends are known as the Bridge End and the Pavilion End.',
					'c-pwcg-wikipedia-ground',
				),
				cite(
					' In the 2003 season the ground was reported in use almost every day between mid-April and early October.',
					'c-pwcg-wikipedia-ground',
				),
			),
		},
		{ id: 'h-werner', type: 'heading', level: 2, text: 'Pierre Werner' },
		{
			id: 'p-werner',
			type: 'paragraph',
			runs: p(
				cite(
					'Pierre Werner (29 December 1913 – 24 June 2002) served as Prime Minister of Luxembourg from 1959 to 1974 and again from 1979 to 1984, alongside long spells as Minister of Finance, Justice, and Foreign Affairs.',
					'c-pwcg-wikipedia-werner',
				),
				cite(
					' He is best known for the 1970 "Werner Plan," an early blueprint for a single European currency that later influenced the Maastricht Treaty and the introduction of the euro.',
					'c-pwcg-wikipedia-werner',
				),
				cite(
					' Werner was also honorary president of the Optimists Cricket Club, whose home ground was renamed for him after his death.',
					'c-pwcg-wikipedia-werner',
				),
			),
		},
		{ id: 'h-cricket', type: 'heading', level: 2, text: 'Cricket at the ground' },
		{
			id: 'p-cricket',
			type: 'paragraph',
			runs: p(
				cite(
					'The ground is the home venue of the Optimists Cricket Club, which competes in the Belgian Cricket League, and of the Luxembourg national cricket team.',
					'c-pwcg-wikipedia-ground',
				),
				cite(
					' It staged its first men’s Twenty20 International on 28 August 2020, when Luxembourg played the Czech Republic, as part of a tri-series with Belgium also taking part, known as the 2020 Luxembourg T20I Trophy.',
					'c-pwcg-wikipedia-ground',
				),
				cite(
					' The following day, Belgium’s Shaheryar Butt scored 125 not out off 50 balls at the ground — the only T20I century recorded there to date.',
					'c-pwcg-wikipedia-ground',
				),
				cite(
					' The ground later hosted the first women’s T20I played in Luxembourg, between Luxembourg and Switzerland in September 2025.',
					'c-pwcg-wikipedia-ground',
				),
			),
		},
		{ id: 'h-location', type: 'heading', level: 2, text: 'Location' },
		{
			id: 'p-location',
			type: 'paragraph',
			runs: p(
				t('The ground sits in the '),
				link('Alzette', 'alzette'),
				t(' valley below the Pëtschend plateau, a few kilometres from the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					', the Roman-era qanat cut into the plateau northeast of the town to carry spring water downslope toward the valley.',
				),
			),
		},
	],
	citations: [c.wikipediaGround, c.wikipediaWerner],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary: 'Initial draft: ground history, Pierre Werner, and cricket at the venue',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

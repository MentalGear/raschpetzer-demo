/**
 * Real content: the Frontinus-Gesellschaft e.V., the German learned society for the history
 * of water, energy and pipeline technology that convened the 2016 Trier symposium whose 2017
 * proceedings ("Wasserwesen zur Zeit des Frontinus") carried the Raschpëtzer's international
 * paper — already cited on `guy-waringo` (`c-waringo-frontinus-2017`). This article covers the
 * society and its Roman namesake; it cross-links to the paper and its authors rather than
 * repeating their content. Citations verified via live web search, real URLs only.
 */
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of mock.ts's tiny inline-run authoring helpers — kept separate (not imported
// from ./mock), matching raschpetzer.ts / raschpetzer-guy-waringo.ts.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

const c = {
	about: {
		id: 'c-frontinus-about',
		title: 'Über uns',
		publisher: 'FRONTINUS-Gesellschaft e.V.',
		url: 'https://www.frontinus.de/ueber-uns/',
	},
	deWiki: {
		id: 'c-frontinus-dewiki',
		title: 'Frontinus-Gesellschaft',
		publisher: 'Wikipedia (German)',
		url: 'https://de.wikipedia.org/wiki/Frontinus-Gesellschaft',
	},
	namesake: {
		id: 'c-frontinus-namesake',
		title: 'Sextus Julius Frontinus',
		publisher: 'Encyclopædia Britannica',
		url: 'https://www.britannica.com/biography/Sextus-Julius-Frontinus',
	},
	trierProgram: {
		id: 'c-frontinus-trier-program',
		title: 'Wasserwesen zur Zeit des Frontinus: Bauwerke – Technik – Kultur — 40th-anniversary international Frontinus symposium, Trier, 25–29 May 2016 (programme)',
		publisher: 'Frontinus-Gesellschaft, hosted via Universität Trier',
		year: 2016,
		url: 'https://www.uni-trier.de/fileadmin/fb5/prof/OEF003/Institut/Veranstaltungen_2016/Frontinus-Gesellsch_Einl_Progr.pdf',
	},
	trierVolumeReview: {
		id: 'c-frontinus-trier-volume-review',
		title: 'Review of Wasserwesen zur Zeit des Frontinus: Bauwerke, Technik, Kultur (Tagungsband des internationalen Frontinus-Symposiums Trier, 25.–29. Mai 2016)',
		publisher: 'Bryn Mawr Classical Review',
		year: 2021,
		url: 'https://bmcr.brynmawr.edu/2021/2021.03.36/',
	},
} satisfies Record<string, Citation>

export const frontinusGesellschaftCitations = c

export const frontinusGesellschaftArticle: Article = {
	id: 'a-frontinus-gesellschaft',
	slug: 'frontinus-gesellschaft',
	locale: 'en',
	title: 'Frontinus-Gesellschaft',
	summary:
		'The Frontinus-Gesellschaft e.V. is a German learned society for the history of water, energy and pipeline technology, named after the Roman water commissioner Sextus Julius Frontinus. Its 2016 Trier symposium published the international paper on the Raschpëtzer qanat.',
	categories: ['history'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				cite(
					'The Frontinus-Gesellschaft e.V. is a scholarly association, founded on 16 October 1976 and headquartered in Bad Wimpfen, Germany, dedicated to the history of water, energy and pipeline technology',
					'c-frontinus-about',
				),
				cite(
					', bringing together researchers from archaeology, history and engineering across roughly twenty countries',
					'c-frontinus-dewiki',
				),
				t('.'),
			),
		},
		{ id: 'h-namesake', type: 'heading', level: 2, text: 'Namesake: Sextus Julius Frontinus' },
		{
			id: 'p-namesake',
			type: 'paragraph',
			runs: p(
				t('The society takes its name from '),
				b('Sextus Julius Frontinus'),
				cite(
					' (c. AD 40 – 103), a Roman senator, general and three-time consul who, in AD 97, was appointed curator aquarum — superintendent of the ',
					'c-frontinus-namesake',
				),
				link('aqueducts', 'roman-aqueducts'),
				cite(
					' supplying Rome. In that role he oversaw the channels, distribution basins, fountains and legal water grants of the city, and wrote De aquaeductu urbis Romae, the first surviving technical treatise on a water-supply system',
					'c-frontinus-namesake',
				),
				t('.'),
			),
		},
		{ id: 'h-mission', type: 'heading', level: 2, text: 'Mission and activities' },
		{
			id: 'p-mission',
			type: 'paragraph',
			runs: p(
				cite(
					'The Frontinus-Gesellschaft organizes national and international symposia, colloquia and excursions on the history of water supply, drainage and energy technology; publishes several monograph and journal series, including the "Frontinus-Schriftenreihe" and the "Geschichte der Wasserversorgung" book series; maintains a specialist library of several thousand titles at the DVGW headquarters in Bonn; and awards the Frontinus Medal for outstanding research in the field',
					'c-frontinus-about',
				),
				t('.'),
			),
		},
		{
			id: 'h-raschpetzer',
			type: 'heading',
			level: 2,
			text: 'The Raschpëtzer and the 2016 Trier symposium',
		},
		{
			id: 'p-raschpetzer',
			type: 'paragraph',
			runs: p(
				cite(
					'In May 2016 the society marked its 40th anniversary with an international symposium in Trier, "Wasserwesen zur Zeit des Frontinus: Bauwerke – Technik – Kultur"',
					'c-frontinus-trier-program',
				),
				cite(
					', whose proceedings were published in 2017 as a BABESCH supplement',
					'c-frontinus-trier-volume-review',
				),
				t(' — the venue for the international paper on the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(' qanat by '),
				link('Guy Waringo', 'guy-waringo'),
				t(
					' and his co-authors; see his article for the paper itself and its publication details.',
				),
			),
		},
	],
	citations: [c.about, c.deWiki, c.namesake, c.trierProgram, c.trierVolumeReview],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft on the Frontinus-Gesellschaft and its role publishing Raschpëtzer research',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

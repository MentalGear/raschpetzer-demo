/**
 * Real content: the Musée National d'Archéologie, d'Histoire et d'Art (MNHA/MNAHA), the
 * Luxembourg state museum credited on the 2022 photographs of the oak shovel recovered near
 * shaft P9 (see `raschpetzer-photographers.ts`, which covers the two named photographers
 * individually — this article is about the institution itself, not the people). Sourced from
 * the museum's own site and Wikipedia via web search; see the citations below.
 */
import type { Article, Citation, Inline, TextRun } from './types'

const t = (text: string): TextRun => ({ text })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

const c = {
	about: {
		id: 'c-mnha-about',
		title: 'About',
		publisher: "Musée National d'Archéologie, d'Histoire et d'Art (MNAHA)",
		url: 'https://www.mnaha.lu/en/about',
	},
	wikipedia: {
		id: 'c-mnha-wikipedia',
		title: 'National Museum of Archaeology, History and Art',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/National_Museum_of_History_and_Art',
	},
	collectionsPortal: {
		id: 'c-mnha-collections-portal',
		title: 'MNAHA online collections portal',
		publisher: "Musée National d'Archéologie, d'Histoire et d'Art (MNAHA)",
		url: 'https://collections.mnaha.lu/',
	},
} satisfies Record<string, Citation>

export const mnhaCitations = c

export const mnhaArticle: Article = {
	id: 'a-mnha',
	slug: 'mnha',
	locale: 'en',
	title: "Musée National d'Archéologie, d'Histoire et d'Art",
	summary:
		"The Musée National d'Archéologie, d'Histoire et d'Art (MNHA/MNAHA) is Luxembourg's national museum of archaeology, history and art, based at the Nationalmusée um Fëschmaart in Luxembourg City — and the institution credited on the 2022 photographs of the oak shovel recovered near the Raschpëtzer's shaft P9.",
	categories: ['history'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				cite(
					"The Musée National d'Archéologie, d'Histoire et d'Art (MNHA/MNAHA) is a Luxembourg state cultural institute that studies, preserves and exhibits the country's archaeological, historical and artistic heritage.",
					'c-mnha-about',
				),
				t(' Its main site, the '),
				t('Nationalmusée um Fëschmaart'),
				cite(
					', occupies the former Collart-de Scherff mansion on the Marché-aux-Poissons in the old town (Ville Haute) of Luxembourg City.',
					'c-mnha-wikipedia',
				),
			),
		},
		{ id: 'h-history', type: 'heading', level: 2, text: 'History' },
		{
			id: 'p-history-origins',
			type: 'paragraph',
			runs: p(
				cite(
					"The museum's roots go back to 1845, when local historians and archaeologists formed the Société archéologique to assemble a collection; the Grand-Ducal Institute, created in 1868, took over responsibility for it.",
					'c-mnha-about',
				),
				cite(
					' The state acquired the Collart-de Scherff mansion in 1922 to house a museum, and the collections reopened to the public in 1946 as the Musées de l’État ("State Museums") after the wartime occupation.',
					'c-mnha-wikipedia',
				),
			),
		},
		{
			id: 'p-history-modern',
			type: 'paragraph',
			runs: p(
				cite(
					'Archaeology at the museum professionalised after 1966, when amateur finders uncovered four exceptional Gallo-Roman burial chambers at Goeblange-Nospelt; the museum hired its first staff archaeologist in 1972, and subsequent excavations across the country have continued to enrich its collections.',
					'c-mnha-about',
				),
				cite(
					' A December 2022 law renamed the institution the Musée National d’Archéologie, d’Histoire et d’Art (MNAHA), with its Fëschmaart site redesignated the Nationalmusée um Fëschmaart.',
					'c-mnha-about',
				),
			),
		},
		{ id: 'h-collections', type: 'heading', level: 2, text: 'Collections and role' },
		{
			id: 'p-collections',
			type: 'paragraph',
			runs: p(
				cite(
					'MNAHA manages three museum sites — the Nationalmusée um Fëschmaart, the Musée Dräi Eechelen and the Réimervilla Echternach — plus two research centres, the documentation centre on the Luxembourg fortress and the Lëtzebuerger Konschtarchiv (art archive).',
					'c-mnha-wikipedia',
				),
				t(
					' As the country’s principal archaeology, history and art museum, it is the standard repository and curator of finds excavated at Luxembourg heritage sites, publishing object records through its ',
				),
				cite('online collections portal', 'c-mnha-collections-portal'),
				t('.'),
			),
		},
		{ id: 'h-raschpetzer', type: 'heading', level: 2, text: 'Connection to the Raschpëtzer' },
		{
			id: 'p-raschpetzer',
			type: 'paragraph',
			runs: p(
				t('MNHA/MNAHA is the institution credited on the 2022 photographs of the '),
				link('oak shovel', 'raschpetzer-shovel'),
				t(' recovered near shaft P9 of the '),
				link('Raschpëtzer qanat', 'raschpetzer-qanat'),
				t(', taken by the museum’s '),
				link('Tom Lucas and Ben Muller', 'raschpetzer-photographers'),
				t('.'),
			),
		},
	],
	citations: [c.about, c.wikipedia, c.collectionsPortal],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft on the MNHA/MNAHA institution credited on the P9 shovel photographs',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

/**
 * Real content: a general, standalone explainer on dendrochronology (tree-ring dating) as a
 * scientific technique — how crossdating and master chronologies work, why oak is especially
 * well suited to the method in Europe, how a dated ring is turned into a felling-date
 * estimate, and applications beyond archaeology (climate science, art history/authentication).
 * Sourced entirely from external, web-researched sources (no brochure citations — this is not
 * Raschpëtzer-specific content). A companion to `./raschpetzer-shaft-p8.ts`, whose "How
 * tree-ring dating works" subsection covers the same method but scoped tightly to the P8 oak
 * beam find; this article is the fuller general treatment that page links out to, and this
 * page links back to it (and to `./raschpetzer.ts`) in its closing section. Every specific
 * fact/number carries its own adjacent citation.
 */
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's/raschpetzer-shaft-p8.ts's tiny inline-run authoring
// helpers — kept separate (not imported from either) so this module has no circular
// dependency on them.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

// External, web-researched sources on dendrochronology as a general technique (not the
// Raschpëtzer brochure — this article has no site-specific sourcing). Reuses two sources
// already found for the P8 deep-dive (Wikipedia's Dendrochronology overview, the LTRR
// crossdating page, and the Hohenheim oak chronology paper) under a fresh `c-dendro-*` id
// prefix, plus several new ones for the technique's history and its non-archaeological
// applications.
const c = {
	overview: {
		id: 'c-dendro-wiki',
		title: 'Dendrochronology',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/Dendrochronology',
	},
	crossdating: {
		id: 'c-dendro-crossdating',
		title: 'Crossdating — The Basic Principle of Dendrochronology',
		publisher: 'Laboratory of Tree-Ring Research, University of Arizona',
		url: 'https://www.ltrr.arizona.edu/lorim/basic.html',
	},
	douglass: {
		id: 'c-dendro-douglass',
		title: 'A. E. Douglass',
		publisher: 'Wikipedia',
		url: 'https://en.wikipedia.org/wiki/A._E._Douglass',
	},
	hohenheimChronology: {
		id: 'c-dendro-hohenheim',
		title: 'The 12,460-Year Hohenheim Oak and Pine Tree-Ring Chronology from Central Europe',
		publisher: 'Radiocarbon (Cambridge University Press)',
		url: 'https://www.cambridge.org/core/journals/radiocarbon/article/12460year-hohenheim-oak-and-pine-treering-chronology-from-central-europea-unique-annual-record-for-radiocarbon-calibration-and-paleoenvironment-reconstructions/41104F23F7389472787A965C7AD6D702',
	},
	oakEurope: {
		id: 'c-dendro-oak-europe',
		title: 'Dendroarchaeology in Europe',
		publisher: 'Frontiers in Ecology and Evolution',
		year: 2022,
		url: 'https://www.frontiersin.org/journals/ecology-and-evolution/articles/10.3389/fevo.2022.823622/full',
	},
	fellingDates: {
		id: 'c-dendro-felling',
		title: 'Tree-ring dating and estimating felling dates of historical timbers (fellingdater)',
		publisher: 'rOpenSci',
		url: 'https://docs.ropensci.org/fellingdater/',
	},
	climate: {
		id: 'c-dendro-climate',
		title: 'How tree rings tell time and climate history',
		publisher: 'NOAA Climate.gov',
		url: 'https://www.climate.gov/news-features/blogs/beyond-data/how-tree-rings-tell-time-and-climate-history',
	},
	rembrandt: {
		id: 'c-dendro-rembrandt',
		title: 'A replication study in dendrochronology — revisiting the panels of two portraits of Rembrandt',
		publisher: 'Humanities and Social Sciences Communications (Nature)',
		year: 2025,
		url: 'https://www.nature.com/articles/s41599-025-06066-2',
	},
} satisfies Record<string, Citation>

export const dendrochronologyCitations = c

export const dendrochronologyArticle: Article = {
	id: 'a-dendrochronology',
	slug: 'dendrochronology',
	locale: 'en',
	title: 'Dendrochronology',
	summary:
		'Dendrochronology is the scientific technique of dating wood to the exact calendar year by matching its annual growth-ring pattern against a reference chronology. Founded in the early twentieth century, it now underpins archaeological dating, climate reconstruction, and the authentication of wooden art and instruments.',
	categories: ['technology'],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				b('Dendrochronology'),
				t(
					', or tree-ring dating, is the science of dating wood to the exact calendar year it grew by reading the pattern of its annual growth rings.',
				),
				cite(
					' Most trees in temperate climates lay down one ring per growing season, and the width of that ring is shaped by the conditions of that particular year',
					'c-dendro-wiki',
				),
				t(
					' — a wide ring in a good growing year, a narrow one in a poor one — producing a sequence unique enough to be matched, sample to sample, across trees, timbers, and centuries.',
				),
			),
		},
		{
			id: 'p-history',
			type: 'paragraph',
			runs: p(
				cite(
					'The technique was founded in the early twentieth century by the American astronomer Andrew Ellicott Douglass, who set out to find a link between sunspot cycles and terrestrial climate and turned to tree rings as a natural, year-by-year record of past conditions',
					'c-dendro-douglass',
				),
				t(
					'. Douglass went on to found the Laboratory of Tree-Ring Research at the University of Arizona in 1937, which remains one of the field’s leading institutions today.',
				),
			),
		},
		{ id: 'h-how-it-works', type: 'heading', level: 2, text: 'How crossdating works' },
		{
			id: 'p-crossdating',
			type: 'paragraph',
			runs: p(
				t('Ring width is driven largely by shared climate conditions, so '),
				cite(
					'trees of the same species growing in the same region tend to lay down a broadly matching sequence of wide and narrow rings in any given stretch of years',
					'c-dendro-crossdating',
				),
				t('. '),
				cite(
					'Crossdating is the process of finding the one position where an undated sample’s ring pattern lines up against a reference sequence — matching not just a couple of rings but a whole distinctive run of them',
					'c-dendro-crossdating',
				),
				t(
					', which is what lets dendrochronologists assign every single ring in a sample to its real calendar year, rather than just counting rings and guessing at an age.',
				),
			),
		},
		{
			id: 'p-master-chronology',
			type: 'paragraph',
			runs: p(
				t('A reference sequence long enough to be useful is built as a '),
				b('master chronology'),
				t(
					': cores from living trees establish a dated sequence back to the present, that sequence is extended by crossdating it against progressively older dead wood — fallen logs, structural timbers, archaeological finds — whose ring patterns overlap it at the near end, and the chain is repeated outward, sample by sample, further into the past. ',
				),
				cite(
					'Built this way from many thousands of overlapping oak and pine samples across central Europe, the Hohenheim chronology now runs continuously across more than 12,000 years',
					'c-dendro-hohenheim',
				),
				t(
					', which is also long enough to serve as a calendar-accurate check on radiocarbon dating itself.',
				),
			),
		},
		{ id: 'h-oak', type: 'heading', level: 2, text: 'Why oak, and why Europe' },
		{
			id: 'p-oak',
			type: 'paragraph',
			runs: p(
				cite(
					'European oak (Quercus robur and Q. petraea) is one of the most thoroughly studied species in dendrochronology: it is long-lived, sensitive to annual growing conditions, resistant to decay, and its outer sapwood is relatively easy to distinguish from the darker heartwood beneath',
					'c-dendro-oak-europe',
				),
				t(
					' — all properties that make a sample easier to date precisely and more likely to survive centuries buried, waterlogged, or built into a structure. Decades of sampling have built continuous regional oak chronologies across large parts of Europe, some reaching back nearly the full length of the Holocene, so a well-preserved oak sample can often be pinned to a single calendar year rather than an approximate range.',
				),
			),
		},
		{ id: 'h-sapwood', type: 'heading', level: 2, text: 'From a dated ring to a felling date' },
		{
			id: 'p-sapwood',
			type: 'paragraph',
			runs: p(
				t('A dated ring is not automatically a felling date. '),
				cite(
					'A living tree’s outermost rings — its sapwood — are structurally distinct from the heartwood beneath, and they are also the rings most easily lost to decay, trimming, or the working of the timber before it reaches an archaeological or historical context',
					'c-dendro-felling',
				),
				t(
					'. If the bark edge itself survives, the felling year — sometimes even the season — can be read directly. If it does not, and the sample’s outer surviving ring is heartwood rather than the true felling surface, the felling date has to be estimated statistically by adding back the typical number of missing sapwood rings for that species and region',
				),
				cite(
					' — a correction with real, quantified uncertainty, not a fixed offset',
					'c-dendro-felling',
				),
				t('.'),
			),
		},
		{
			id: 'h-applications',
			type: 'heading',
			level: 2,
			text: 'Applications beyond archaeology',
		},
		{
			id: 'p-climate',
			type: 'paragraph',
			runs: p(
				cite(
					'Because ring width and density track the growing conditions of their year, tree-ring records are also one of the primary tools of paleoclimatology: comparing ring patterns against instrumental weather records where the two overlap lets scientists reconstruct temperature and precipitation for centuries before written records began',
					'c-dendro-climate',
				),
				t(
					', and tens of thousands of such series, from sites worldwide, are archived for exactly this purpose — a sub-field usually called dendroclimatology.',
				),
			),
		},
		{
			id: 'p-arthistory',
			type: 'paragraph',
			runs: p(
				t(
					'The same crossdating method is routinely applied to wooden panel paintings, furniture, string instruments, and timber-framed buildings — dating (and, in cases of suspected forgery, dis-dating) a wooden object by dating the wood it is made of. ',
				),
				cite(
					'A recent replication study, for instance, re-examined the oak panels of two Rembrandt portraits using dendrochronology, cross-checking earlier attributions against independently sourced tree-ring data',
					'c-dendro-rembrandt',
				),
				t(
					' — the same underlying technique as an archaeological beam, applied to a very different kind of question.',
				),
			),
		},
		{ id: 'h-raschpetzer', type: 'heading', level: 2, text: 'At the Raschpëtzer' },
		{
			id: 'p-raschpetzer',
			type: 'paragraph',
			runs: p(
				t('This is the method behind the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' qanat’s only absolute construction date: an oak beam recovered near the base of ',
				),
				link('shaft P8', 'shaft-p8'),
				t(
					' was crossdated against the central European oak chronology at the Landesmuseum in Trier, giving an outer ring of AD 114 and an extrapolated felling year of about AD 131. See the Shaft P8 article for that specific find, the sapwood correction behind its felling-date estimate, and how the date anchors the qanat’s chronology.',
				),
			),
		},
	],
	citations: [
		c.overview,
		c.crossdating,
		c.douglass,
		c.hohenheimChronology,
		c.oakEurope,
		c.fellingDates,
		c.climate,
		c.rembrandt,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 1),
			summary:
				'Initial draft: general explainer on dendrochronology from web-researched sources',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

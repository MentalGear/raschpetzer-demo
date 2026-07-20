/**
 * Real content: a deep-dive on the oak shovel found in the mud near shaft P9 of the
 * Raschpëtzer qanat — the main `raschpetzer.ts` article covers it in two sentences plus a
 * front/back gallery under "Finds"; this article goes further into how/when it was found,
 * what it physically looks like, what its find context implies about its use, why organic
 * wood survives at all in this setting, and how it compares to other known wooden digging
 * tools. Brochure facts are sourced from the vendored PDF (`static/sources/`), read directly
 * (pages 10 and 19, the two pages that discuss this find) rather than paraphrased secondhand.
 * External comparanda (preservation chemistry, other wooden spade finds, Roman spade
 * terminology) were found via web search and are cited with real URLs — see the `c` object
 * below. The MNHA custody note is deliberately hedged: no public collections.mnaha.lu record
 * for this specific object could be located during research (see `p-custody`).
 */
import { base } from '$app/paths'
import type { Article, Citation, Inline, TextRun } from './types'

// Local copies of raschpetzer.ts's tiny inline-run authoring helpers — kept separate (not
// imported from ./raschpetzer or ./mock) so this module has no dependency on either; it is
// a standalone article that merely *links to* the main qanat article by slug.
const t = (text: string): TextRun => ({ text })
const b = (text: string): TextRun => ({ text, marks: { bold: true } })
const link = (text: string, slug: string): TextRun => ({
	text,
	marks: { link: { kind: 'internal', slug } },
})
const cite = (text: string, id: string): TextRun => ({ text, marks: { cite: id } })
const p = (...runs: Inline): Inline => runs

/** Same base-prefixing helper as raschpetzer.ts — a static-asset path needs the GitHub
 *  Pages project-subpath base prefixed by hand or it 404s under a non-root deploy. */
const asset = (path: string): string => `${base}${path}`

const BROCHURE_PDF = asset('/sources/raschpetzer-brochure-2018-en.pdf')

const c = {
	brochureP10: {
		id: 'c-shovel-brochure-p10',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 10, "two oak shovels were discovered")',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=10`,
	},
	brochureP19: {
		id: 'c-shovel-brochure-p19',
		title: 'The Raschpëtzer — A Roman Underground Water Supply System (p. 19, "when pumping out the mud, the previously mentioned oak shovels were discovered")',
		authors: 'Faber, Sonja; Waringo, Guy; Werner, Henri',
		year: 2018,
		publisher: "Syndicat d'initiative et de tourisme de la Commune de Walferdange",
		url: `${BROCHURE_PDF}#page=19`,
	},
	waterloggedWood: {
		id: 'c-shovel-waterlogged-wood',
		title: 'Conservation of Waterlogged Wood — Past, Present and Future Perspectives',
		authors: 'Broda, M.; Hill, C. A. S.',
		year: 2021,
		publisher: 'Forests 12(9):1193, MDPI',
		url: 'https://www.mdpi.com/1999-4907/12/9/1193',
	},
	bronzeAgeSpade: {
		id: 'c-shovel-bronze-age-oak-spade',
		title: 'Archaeologists uncover one of the oldest and most complete wooden tools ever found in Britain',
		publisher: 'Wessex Archaeology',
		year: 2024,
		url: 'https://www.wessexarch.co.uk/news/archaeologists-uncover-one-oldest-and-most-complete-wooden-tools-ever-found-britain',
	},
	romanPala: {
		id: 'c-shovel-roman-pala',
		title: 'Smith\'s Dictionary of Greek and Roman Antiquities — "Pala" (the Roman spade)',
		authors: 'Smith, William (ed.)',
		year: 1875,
		publisher: 'LacusCurtius, University of Chicago',
		url: 'http://penelope.uchicago.edu/Thayer/E/Roman/Texts/secondary/SMIGRA*/Pala.html',
	},
	mnha: {
		id: 'c-shovel-mnha',
		title: "Musée National d'Archéologie, d'Histoire et d'Art (MNHA)",
		publisher: 'mnaha.lu',
		url: 'https://www.mnaha.lu/en/',
	},
} satisfies Record<string, Citation>

export const shovelArticle: Article = {
	id: 'a-shovel',
	slug: 'raschpetzer-shovel',
	locale: 'en',
	title: 'The Raschpëtzer Shovel',
	summary:
		'A one-piece oak shovel, one of two recovered from waterlogged mud near shaft P9 of the Raschpëtzer qanat during the 1991 clearance — among the best-preserved wooden hand tools associated with the site, and a rare direct trace of the labour that cut the gallery itself.',
	categories: ['archaeology'],
	lead: {
		id: 'fig-lead',
		type: 'figure',
		tone: 4,
		alt: 'Wooden shovel found near shaft P9, front view, laid on a grey backdrop next to a 30 cm photographic scale bar',
		caption:
			'The oak shovel recovered from the mud near shaft P9 — front view, with a 30 cm scale bar.',
		credit: 'Photo: Tom Lucas & Ben Muller, MNHA, 2022',
		src: asset('/img/raschpetzer/a-shovel-P9-FOTO-Tom-Lucas-Ben-Muller-MNHA-2022-fallback.jpg'),
		ratio: 1920 / 1280,
		sizes: '(min-width: 768px) 640px, 100vw',
	},
	infobox: [
		{ label: 'Object type', value: 'Digging shovel' },
		{ label: 'Material', value: 'Oak (one of a pair found together)' },
		{ label: 'Findspot', value: 'Shaft P9, Raschpëtzer qanat, Walferdange' },
		{ label: 'Discovered', value: '1991, during mud clearance of the gallery' },
		{ label: 'Preservation', value: 'Waterlogged (anaerobic) mud' },
		{ label: 'Photographed', value: 'Tom Lucas & Ben Muller, MNHA, 2022' },
	],
	blocks: [
		{
			id: 'p-intro',
			type: 'paragraph',
			runs: p(
				t('Among the finds recovered from the '),
				link('Raschpëtzer', 'raschpetzer-qanat'),
				t(
					' qanat, one small object gives an unusually direct link to the people who dug it: an ',
				),
				b('oak shovel'),
				t(', one of two found together in the alluvial mud near shaft '),
				link('P9', 'raschpetzer-shafts'),
				cite(
					", the gallery's easternmost and uppermost point — uncovered in 1991 as excavators pumped the mud out of the gallery there.",
					'c-shovel-brochure-p10',
				),
				t(
					' Wood this old normally rots away entirely; that this one survives at all, in recognisable shovel form, is itself the more interesting story.',
				),
			),
		},
		{ id: 'h-discovery', type: 'heading', level: 2, text: 'Discovery' },
		{
			id: 'p-discovery',
			type: 'paragraph',
			runs: p(
				cite(
					'Shaft P9 is the qanat\'s "mother shaft" — its most upstream point. The gallery driving stopped abruptly about 6 metres east of the shaft, apparently once enough water had been captured, and for roughly 13 metres downstream of that point the gallery was found to have no stone-lined channel at all.',
					'c-shovel-brochure-p19',
				),
				t(' When this section was excavated, '),
				cite(
					'it was filled with mud almost to the crown of the tunnel, the mud level tapering off in a gentle slope downstream. It was only while that mud was being pumped out that the two oak shovels came to light',
					'c-shovel-brochure-p19',
				),
				t(
					' — left behind, presumably, by the Roman-era workers who had been digging there, and then sealed under sediment for roughly seventeen centuries. The same clearance also uncovered a small niche cut into the gallery wall near the P9 portal, with a carved gutter above it to divert seepage water',
				),
				cite(
					' — probably a refuge where a worker could stand clear while loads were hoisted up the shaft.',
					'c-shovel-brochure-p19',
				),
			),
		},
		{ id: 'h-description', type: 'heading', level: 2, text: 'Physical description' },
		{
			id: 'p-description',
			type: 'paragraph',
			runs: p(
				t(
					'The two surviving photographs — reproduced here front and back — show a single wooden implement roughly the length of an adult forearm-and-a-half beside its 30 cm scale bar: a broad, rounded, spade-shaped blade with a smooth working face, its grain fanning outward from the point where a narrower haft leaves the blade, tapering into a long, slightly curved handle. Centuries of waterlogging have left the wood a uniform grey-brown throughout and visibly fragile — a crack has opened partway along the handle, separating it into two pieces that are photographed carefully realigned. No metal fittings are visible in either image; the tool, blade and haft together, reads as a single worked piece of oak rather than a wooden handle fitted to a separate blade.',
				),
			),
		},
		{
			id: 'fig-reverse',
			type: 'figure',
			tone: 4,
			alt: 'Wooden shovel found near shaft P9, reverse view, laid on a grey backdrop next to a 30 cm photographic scale bar',
			caption: 'The same shovel, reverse side.',
			credit: 'Photo: Tom Lucas & Ben Muller, MNHA, 2022',
			src: asset(
				'/img/raschpetzer/b-shovel-P9-FOTO-Tom-Lucas-Ben-Muller-MNHA-2022-fallback.jpg',
			),
			ratio: 1920 / 1280,
			sizes: '(min-width: 768px) 640px, 100vw',
		},
		{ id: 'h-function', type: 'heading', level: 2, text: 'What it tells us' },
		{
			id: 'p-function',
			type: 'paragraph',
			runs: p(
				t('The brochure treats the P9 shovels as tools '),
				cite('likely used to dig the gallery itself', 'c-shovel-brochure-p10'),
				t(
					' — a reasonable inference from where they turned up (in situ, in unexcavated fill, right where the gallery-cutting stopped) rather than a documented certainty; no tool marks or use-wear analysis are reported in the source material used for this article. If the inference holds, it is a striking piece of context for the ',
				),
				link('qanat', 'raschpetzer-qanat'),
				t(
					' own precision: a gallery driven against the natural dip of the strata, on a near-constant gentle downhill gradient over hundreds of metres, cut largely by hand tools like this one.',
				),
			),
		},
		{ id: 'h-preservation', type: 'heading', level: 2, text: 'Why the wood survived' },
		{
			id: 'p-preservation',
			type: 'paragraph',
			runs: p(
				t(
					'Wood is one of the least durable materials in the archaeological record — it is normally eaten away within years by fungi and aerobic bacteria unless conditions stop them. ',
				),
				cite(
					'Permanently waterlogged, oxygen-starved ground is one of the few settings where that decay is arrested: without free oxygen, only a narrow, slow-acting group of anaerobic "erosion" bacteria remain active, so buried wood can survive for millennia instead of years, even as its cell walls are gradually weakened and its structure left fragile once re-exposed to air.',
					'c-shovel-waterlogged-wood',
				),
				t(
					' The mud that filled the unfinished stretch of gallery beyond P9 did exactly that for these shovels, in a completely dark, sealed underground setting that is about as stable and oxygen-poor as waterlogged burial gets.',
				),
			),
		},
		{ id: 'h-comparison', type: 'heading', level: 2, text: 'Comparable finds and terms' },
		{
			id: 'p-comparison',
			type: 'paragraph',
			runs: p(
				t(
					'One-piece wooden digging tools of this kind are rare finds anywhere, precisely because so few survive at all: ',
				),
				cite(
					'a Middle Bronze Age oak spade found near Poole Harbour, England, and radiocarbon-dated to roughly 3,500–3,400 years old — among the oldest and most complete wooden tools ever recovered in Britain — was likewise hewn from a single piece of oak and owes its survival to waterlogged ground.',
					'c-shovel-bronze-age-oak-spade',
				),
				t(
					' That find is a different period and place, not a direct parallel, but it shows the same combination — oak, one-piece construction, wet burial — recurring wherever a wooden digging tool happens to survive at all. Latin agricultural writers give the Roman digging spade its own name: ',
				),
				cite(
					'the pala, with a reinforced two-handled version called the bipalium (still used in Italy under the name vanga) for deeper trenching work such as preparing ground for vines — and Cato\'s farm-management writing lists wooden spades ("palas ligneas") among a farm\'s basic equipment.',
					'c-shovel-roman-pala',
				),
				t(
					' Nothing in the sources used here ties the Raschpëtzer shovel to that specific vocabulary, but it places the object within a known, named category of Roman-era tool rather than treating it as unprecedented.',
				),
			),
		},
		{ id: 'h-custody', type: 'heading', level: 2, text: 'Custody and photography' },
		{
			id: 'p-custody',
			type: 'paragraph',
			runs: p(
				t('Both photographs reproduced here are credited to '),
				link('Tom Lucas and Ben Muller', 'raschpetzer-photographers'),
				cite(', of the ', 'c-shovel-mnha'),
				b("Musée National d'Archéologie, d'Histoire et d'Art"),
				t(
					" (MNHA), Luxembourg, and dated 2022 — indicating the shovel is or was in the museum's care for documentation. A search of the museum's public online collection (collections.mnaha.lu) during research for this article did not surface a catalogue record specific to this object, so no accession or inventory number is given here; this article cites only what the brochure and the photograph credits themselves state.",
				),
			),
		},
	],
	citations: [
		c.brochureP10,
		c.brochureP19,
		c.waterloggedWood,
		c.bronzeAgeSpade,
		c.romanPala,
		c.mnha,
	],
	revisions: [
		{
			id: 'r1',
			author: 'raschpetzer-model-digital-3d SSOT',
			ts: Date.UTC(2026, 6, 20),
			summary:
				'Initial draft: a dedicated deep-dive on the P9 shovel, split out of the main qanat article\'s brief "Finds" mention',
			blocks: [],
		},
	],
	updatedAt: Date.UTC(2026, 6, 20),
	contributors: ['raschpetzer-model-digital-3d SSOT'],
}

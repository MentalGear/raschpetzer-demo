/**
 * `DataTable` column/facet model for the Sources page (`routes/sources/+page.svelte`).
 */
import type { ColumnSpec, FacetSpec } from '@kit/ui'
import type { SourceItem } from '../data/sources'

export const sourceColumns: ColumnSpec<SourceItem>[] = [
	{ id: 'title', header: 'Title', accessor: (s) => s.title },
	{ id: 'authors', header: 'Authors', accessor: (s) => s.authors ?? '' },
	{ id: 'year', header: 'Year', accessor: (s) => s.year ?? '', filterable: false },
	{ id: 'publisher', header: 'Publisher', accessor: (s) => s.publisher ?? '' },
	{ id: 'articleTitle', header: 'Cited in', accessor: (s) => s.articleTitle },
]

export const sourceFacets: FacetSpec<SourceItem>[] = [
	{ id: 'publisher', label: 'Publisher', values: (s) => (s.publisher ? [s.publisher] : []) },
	{ id: 'articleTitle', label: 'Cited in', values: (s) => [s.articleTitle] },
]

/**
 * Domain-free section descriptor: a contiguous index range with display strings.
 * Lives in the kit so the virtualized grid + layout math never depend on the app.
 * App code (e.g. photos grouping by date) produces these.
 */
export interface Section {
	key: string
	title: string
	subtitle?: string
	/** inclusive */
	startIndex: number
	/** exclusive */
	endIndex: number
	count: number
}

<script lang="ts">
	/** A link card for article lists (browse, category, search, recent). */
	import type { Article } from '$lib/wikipedia/data/types'
	import { href } from '$lib/paths'
	import * as Card from '@kit/ui/shadcn-components/ui/card'

	let { article }: { article: Article } = $props()
</script>

<a
	href={href(`/${article.slug}`)}
	class="group block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
>
	<Card.Root
		class="h-full gap-2 transition-shadow group-hover:border-primary group-hover:shadow-md"
	>
		<Card.Header>
			<Card.Title class="text-lg">{article.title}</Card.Title>
			<Card.Description class="line-clamp-3">{article.summary}</Card.Description>
		</Card.Header>
	</Card.Root>
</a>

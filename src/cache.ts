import type { CompletionsResult } from './completions';

const CACHE_PREFIX = 'https://cache.cubedhuang.com/';

type Cached<T> = { data: T; lastUpdated: number };

async function putCache(cacheKey: string, data: unknown) {
	const response = new Response(JSON.stringify(data), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 's-maxage=300',
		},
	});
	await caches.default.put(cacheKey, response);
}

export async function makeCachedRequest(
	env: Env,
	ctx: ExecutionContext<unknown>,
	key: string,
	fetchData: () => Promise<CompletionsResult>,
) {
	const cache = caches.default;
	const cacheKey = `${CACHE_PREFIX}${key}`;
	const cached = await cache.match(cacheKey);
	if (cached) {
		const data = (await cached.json()) as CompletionsResult;
		if ('completions' in data) {
			return data;
		}
	}

	const kv = env.CIOS_CACHE;
	const kvCached = (await kv.get(key, 'json')) as Cached<CompletionsResult> | null;
	const kvCachedGood = kvCached ? 'completions' in kvCached.data : false;

	const fiveMinutes = 5 * 60 * 1000;
	const isStale = !kvCached || Date.now() - kvCached.lastUpdated > fiveMinutes;

	if (!isStale && kvCachedGood) {
		ctx.waitUntil(putCache(cacheKey, kvCached.data));
		return kvCached.data;
	}

	let fetchedData: CompletionsResult;
	const refresh = fetchData().then(async (data) => {
		fetchedData = data;
		await Promise.all([
			putCache(cacheKey, data),
			kv.put(
				key,
				JSON.stringify({
					data,
					lastUpdated: Date.now(),
				} satisfies Cached<CompletionsResult>),
			),
		]);
	});

	if (kvCached && kvCachedGood) {
		ctx.waitUntil(refresh);
		return kvCached.data;
	}

	await refresh;
	return fetchedData!;
}

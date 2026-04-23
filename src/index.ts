import { getCiosPage } from './secret';
import { type Completions, getCompletions, titles } from './completions';
import { makeCachedRequest } from './cache';

// @ts-expect-error
import _template from './template.html';
const template: string = _template;
// @ts-expect-error
import _klass from './class.html';
const klass: string = _klass;

export default {
	async fetch(request, env, ctx) {
		const result = await makeCachedRequest(env, ctx, 'completions', async () => {
			const html = await getCiosPage();
			return getCompletions(html);
		});
		if ('titlesMissing' in result) {
			return new Response('error fetching CIOS completion', {
				status: 500,
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		const classes = Object.entries(titles).map(([key, title]) => {
			const completion = result.completions[key];
			const percent = ((completion.responded / completion.total) * 100).toFixed(2);
			return klass
				.replaceAll('%%title%%', title)
				.replaceAll('%%percent%%', percent)
				.replaceAll('%%total%%', completion.total.toString())
				.replaceAll('%%responded%%', completion.responded.toString());
		});

		return new Response(
			template.replaceAll('%%classes%%', classes.join('\n')).replaceAll(
				'%%lastUpdated%%',
				new Date(result.lastUpdated).toLocaleString('en-US', {
					timeZone: 'America/New_York',
					timeZoneName: 'short', // Optional: displays EST/EDT
				}),
			),
			{
				status: 200,
				headers: { 'Content-Type': 'text/html' },
			},
		);
	},
} satisfies ExportedHandler<Env>;

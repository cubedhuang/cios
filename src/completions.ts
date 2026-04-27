import parse from 'node-html-parser';

export const titles = {
	'Spring 2026 CS 2110 Lecture A': 'A',
	'Spring 2026 CS 2110 Lecture B': 'B',
	'Spring 2026 CS 2110 Lecture C': 'C',
	'Spring 2026 CS 2110 Lecture D': 'D',
	'Spring 2026 CS 2110 Lecture O1': 'O1',
} as const;

export type Completion = { responded: number; total: number };
export type Completions = Record<string, Completion>;
export type CompletionsResult = ({ completions: Record<string, Completion> } | { titlesMissing: string[] }) & { lastUpdated: number };

export function getCompletions(html: string): CompletionsResult {
	const root = parse(html);

	const completions: Record<string, Completion | null> = Object.fromEntries(Object.keys(titles).map((title) => [title, null]));

	for (const course of root.querySelectorAll('.lnkReportType')) {
		const title = course.querySelector('.lblCourseInfo')?.text ?? '';
		if (!Object.hasOwn(completions, title) || completions[title] !== null) continue;

		const respondedNumbers = course.querySelector('.lblAttendees');
		console.log({ title, respondedNumbers: respondedNumbers?.text });
		const [responded, total] = /\((\d+)\/(\d+)\)/.exec(respondedNumbers?.text ?? '')?.slice(1) ?? ['0', '0'];
		completions[title] = {
			responded: parseInt(responded),
			total: parseInt(total),
		};
	}

	const titlesMissing = Object.entries(completions)
		.filter(([_, v]) => v === null)
		.map(([t]) => t);
	if (titlesMissing.length) {
		return { titlesMissing, lastUpdated: Date.now() };
	}

	return { completions: completions as Record<string, Completion>, lastUpdated: Date.now() };
}

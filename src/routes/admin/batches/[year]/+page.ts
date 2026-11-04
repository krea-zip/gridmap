import { error } from '@sveltejs/kit';

export const load = ({ params }) => {
	const year = Number(params.year);
	if (!Number.isInteger(year) || year < 2018 || year > 2100) error(404, 'There is no such batch.');
	return { year };
};

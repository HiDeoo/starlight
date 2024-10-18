import { defineMiddleware } from 'astro:middleware';
import { useTranslations } from './utils/translations';

export const onRequest = defineMiddleware((context, next) => {
	const locale = context.url.pathname.split('/')[1] || context.preferredLocale || 'en';
	context.locals.t = useTranslations(locale);

	return next();
});

import { z } from 'astro/zod';
import { type ContentConfig, type SchemaContext } from 'astro:content';
import project from 'virtual:starlight/project-context';
import config from 'virtual:starlight/user-config';
import { getCollectionPathFromRoot } from '../loader';
import { parseWithFriendlyErrors, parseAsyncWithFriendlyErrors } from './error-map';
import { stripLeadingAndTrailingSlashes } from './path';
import {
	getSiteTitle,
	getSiteTitleHref,
	getToC,
	type PageProps,
	type StarlightRouteData,
} from './route-data';
import type { StarlightDocsEntry } from './routing';
import { slugToLocaleData, urlToSlug } from './slugs';
import { getPrevNextLinks, getSidebar, getSidebarFromConfig } from './navigation';
import { docsSchema } from '../schema';
import type { Prettify, RemoveIndexSignature } from './types';
import { DeprecatedLabelsPropProxy } from './i18n';
import { SidebarItemSchema } from '../schemas/sidebar';
import type { StarlightConfig, StarlightUserConfig } from './user-config';

/**
 * The frontmatter schema for Starlight pages derived from the default schema for Starlight’s
 * `docs` content collection.
 * The frontmatter schema for Starlight pages cannot include some properties which will be omitted
 * and some others needs to be refined to a stricter type.
 */
const StarlightPageFrontmatterSchema = async (context: SchemaContext) => {
	const userDocsSchema = await getUserDocsSchema();
	const schema = typeof userDocsSchema === 'function' ? userDocsSchema(context) : userDocsSchema;

	return schema.transform((frontmatter) => {
		/**
		 * Starlight pages can only be edited if an edit URL is explicitly provided.
		 * The `sidebar` frontmatter prop only works for pages in an autogenerated links group.
		 * Starlight pages edit links cannot be autogenerated.
		 *
		 * These changes to the schema are done using a transformer and not using the usual `omit`
		 * method because when the frontmatter schema is extended by the user, an intersection between
		 * the default schema and the user schema is created using the `and` method. Intersections in
		 * Zod returns a `ZodIntersection` object which does not have some methods like `omit` or
		 * `pick`.
		 *
		 * This transformer only sets the `editUrl` default value and removes the `sidebar` property
		 * from the validated output but does not appply any changes to the input schema type itself so
		 * this needs to be done manually.
		 *
		 * @see StarlightPageFrontmatter
		 * @see https://github.com/colinhacks/zod#intersections
		 */
		const { editUrl, sidebar, ...others } = frontmatter;
		const pageEditUrl = editUrl === undefined || editUrl === true ? false : editUrl;
		return { ...others, editUrl: pageEditUrl };
	});
};

/**
 * Type of Starlight pages frontmatter schema.
 * We manually refines the `editUrl` type and omit the `sidebar` property as it's not possible to
 * do that on the schema itself using Zod but the proper validation is still using a transformer.
 * @see StarlightPageFrontmatterSchema
 */
type StarlightPageFrontmatter = Omit<
	z.input<Awaited<ReturnType<typeof StarlightPageFrontmatterSchema>>>,
	'editUrl' | 'sidebar'
> & { editUrl?: string | false };

/** Parse sidebar prop to ensure it's valid. */
const validateSidebarProp = (
	sidebarProp: StarlightUserConfig['sidebar']
): StarlightConfig['sidebar'] => {
	return parseWithFriendlyErrors(
		SidebarItemSchema.array().optional(),
		sidebarProp,
		'Invalid sidebar prop passed to the `<StarlightPage/>` component.'
	);
};

/**
 * The props accepted by the `<StarlightPage/>` component.
 */
export type StarlightPageProps = Prettify<
	// Remove the index signature from `Route`, omit undesired properties and make the rest optional.
	Partial<Omit<RemoveIndexSignature<PageProps>, 'entry' | 'entryMeta' | 'id' | 'locale' | 'slug'>> &
		// Add the sidebar definitions for a Starlight page.
		Partial<Pick<StarlightRouteData, 'hasSidebar'>> & {
			sidebar?: StarlightUserConfig['sidebar'];
			// And finally add the Starlight page frontmatter properties in a `frontmatter` property.
			frontmatter: StarlightPageFrontmatter;
		}
>;

/**
 * A docs entry used for Starlight pages meant to be rendered by plugins and which is safe to cast
 * to a `StarlightDocsEntry`.
 * A Starlight page docs entry cannot be rendered like a content collection entry.
 */
type StarlightPageDocsEntry = Omit<StarlightDocsEntry, 'id' | 'render'> & {
	/**
	 * The unique ID if using the `legacy.collections` for this Starlight page which cannot be
	 * inferred from codegen like content collection entries or the slug.
	 */
	id: string;
};

export async function generateStarlightPageRouteData({
	props,
	url,
}: {
	props: StarlightPageProps;
	url: URL;
}): Promise<StarlightRouteData> {
	const { isFallback, frontmatter, ...routeProps } = props;
	const slug = urlToSlug(url);
	const pageFrontmatter = await getStarlightPageFrontmatter(frontmatter);
	const id = project.legacyCollections ? `${stripLeadingAndTrailingSlashes(slug)}.md` : slug;
	const localeData = slugToLocaleData(slug);
	const sidebar = props.sidebar
		? getSidebarFromConfig(validateSidebarProp(props.sidebar), url.pathname, localeData.locale)
		: getSidebar(url.pathname, localeData.locale);
	const headings = props.headings ?? [];
	const pageDocsEntry: StarlightPageDocsEntry = {
		id,
		slug,
		body: '',
		collection: 'docs',
		filePath: `${getCollectionPathFromRoot('docs', project)}/${stripLeadingAndTrailingSlashes(slug)}.md`,
		data: {
			...pageFrontmatter,
			sidebar: {
				attrs: {},
				hidden: false,
			},
		},
	};
	const entry = pageDocsEntry as StarlightDocsEntry;
	const entryMeta: StarlightRouteData['entryMeta'] = {
		dir: props.dir ?? localeData.dir,
		lang: props.lang ?? localeData.lang,
		locale: localeData.locale,
	};
	const editUrl = pageFrontmatter.editUrl ? new URL(pageFrontmatter.editUrl) : undefined;
	const lastUpdated =
		pageFrontmatter.lastUpdated instanceof Date ? pageFrontmatter.lastUpdated : undefined;
	const routeData: StarlightRouteData = {
		...routeProps,
		...localeData,
		id,
		editUrl,
		entry,
		entryMeta,
		hasSidebar: props.hasSidebar ?? entry.data.template !== 'splash',
		headings,
		labels: DeprecatedLabelsPropProxy,
		lastUpdated,
		pagination: getPrevNextLinks(sidebar, config.pagination, entry.data),
		sidebar,
		siteTitle: getSiteTitle(localeData.lang),
		siteTitleHref: getSiteTitleHref(localeData.locale),
		slug,
		toc: getToC({
			...routeProps,
			...localeData,
			entry,
			entryMeta,
			headings,
			id,
			locale: localeData.locale,
			slug,
		}),
	};
	if (isFallback) {
		routeData.isFallback = true;
	}
	return routeData;
}

/** Validates the Starlight page frontmatter properties from the props received by a Starlight page. */
async function getStarlightPageFrontmatter(frontmatter: StarlightPageFrontmatter) {
	// This needs to be in sync with ImageMetadata.
	// https://github.com/withastro/astro/blob/cf993bc263b58502096f00d383266cd179f331af/packages/astro/src/assets/types.ts#L32
	const schema = await StarlightPageFrontmatterSchema({
		image: () =>
			z.object({
				src: z.string(),
				width: z.number(),
				height: z.number(),
				format: z.union([
					z.literal('png'),
					z.literal('jpg'),
					z.literal('jpeg'),
					z.literal('tiff'),
					z.literal('webp'),
					z.literal('gif'),
					z.literal('svg'),
					z.literal('avif'),
				]),
			}),
	});

	// Starting with Astro 4.14.0, a frontmatter schema that contains collection references will
	// contain an async transform.
	return parseAsyncWithFriendlyErrors(
		schema,
		frontmatter,
		'Invalid frontmatter props passed to the `<StarlightPage/>` component.'
	);
}

/** Returns the user docs schema and falls back to the default schema if needed. */
async function getUserDocsSchema(): Promise<
	NonNullable<ContentConfig['collections']['docs']['schema']>
> {
	const userCollections = (await import('virtual:starlight/collection-config')).collections;
	return userCollections?.docs.schema ?? docsSchema();
}

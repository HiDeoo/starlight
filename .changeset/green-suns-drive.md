---
"@astrojs/starlight": minor
---

Adds support for Astro v5, drops support for Astro v4.

#### Upgrade Astro and dependencies

⚠️ **BREAKING CHANGE:** Astro v4 is no longer supported. Make sure you [update Astro](https://docs.astro.build/en/guides/upgrade-to/v5/) and any other official integrations at the same time as updating Starlight:

```sh
npx @astrojs/upgrade
```

_Community Starlight plugins and Astro integrations may also need to be manually updated to work with Astro v5. If you encounter any issues, please reach out to the plugin or integration author to see if it is a known issue or if an updated version is being worked on._

#### Update your collections

⚠️ **BREAKING CHANGE:** Starlight's internal [content collections](https://docs.astro.build/en/guides/content-collections/), which organize, validate, and render your content, have been updated to use Astro's new Content Layer API and require configuration changes in your project.

1. **Move the content config file.** This file no longer lives within the `src/content/config.ts` folder and should now exist at `src/content.config.ts`.


1. **Edit the collection definition(s).** To update the `docs` collection, a `loader` is now required:

   ```diff
    // src/content.config.ts
    import { defineCollection } from "astro:content";
   +import { docsLoader } from "@astrojs/starlight/loaders";
    import { docsSchema } from "@astrojs/starlight/schema";

    export const collections = {
   -  docs: defineCollection({ schema: docsSchema() }),
   +  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
    };
   ```

   If you are using the [`i18n` collection](https://starlight.astro.build/guides/i18n/#translate-starlights-ui) to provide translations for additional languages you support or override our default labels, you will need to update the collection definition in a similar way and remove the collection `type` which is no longer available:

   ```diff
    // src/content.config.ts
    import { defineCollection } from "astro:content";
   +import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
    import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";

    export const collections = {
   -  docs: defineCollection({ schema: docsSchema() }),
   +  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
   -  i18n: defineCollection({ type: 'data', schema: i18nSchema() }),
   +  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
    };
   ```

1. **Update other collections.** To update any other collections you may have, follow the [“Updating existing collections”](https://docs.astro.build/en/guides/upgrade-to/v5/#updating-existing-collections) section in the Astro 5 upgrade guide.

If you are unable to make any changes to your collections at this time, including Starlight's default `docs` and `i18n` collections, you can enable the [`legacy.collections` flag](https://docs.astro.build/en/reference/legacy-flags/) to upgrade to v5 without updating your collections. This legacy flag exists to provide temporary backwards compatibility, and will allow you to keep your collections in their current state until the legacy flag is no longer supported.

# builder-templates

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

### Add new templates

To add a new template just add a new directory in the `templates` folder, with a `data.json`, `preview.png` and `preview.mp4` files.

The `data.json` must include the following properties:

```json
{
  "id": "bc857f8f-9634-4f9d-af59-43eca033d3bb",
  "name": "The House",
  "description": "Your house in Decentraland ideal for your own World.",
  "repo": "https://github.com/vrglitch/home_Temp_sdk7",
  "layout": {
    "rows": 8,
    "cols": 8
  }
}
```

When the `"repo"` property is missing, the template is added a `"coming_soon"` and will be shown grayed out in the Builder.

### Release

The CI will publish the `@dcl/builder-templates` package automatically.

Every push into `main` does a release under the `@next` tag and uploads the assets to the DEV and STG environments (.zone and .today)

Every GitHub release publishes a new version as `@latest` and uploads the assets to the PRD environment (.org)

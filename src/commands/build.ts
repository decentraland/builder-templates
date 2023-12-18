import { resolve } from "path";
import JSZip from "jszip";
import { v4 } from "uuid";
import { hashV1 } from "@dcl/hashing";
import mimeTypes from "mime-types";
import { list, readBuffer, readJson, writeFile } from "../lib/fs";
import { Manifest, TemplateData } from "../lib/types";
import { getStorageUrl } from "../lib/s3";
import { HeadObjectCommand, S3, S3ClientConfigType } from "@aws-sdk/client-s3";
import {
  AWS_ACCESS_KEY,
  AWS_ACCESS_SECRET,
  AWS_STORAGE_URL,
  S3_BUCKET_NAME,
  S3_REGION,
  S3_UPLOAD_CONCURRENCY,
} from "../lib/config";
import { Upload } from "@aws-sdk/lib-storage";

const COMPOSITE_PATH = "assets/scene/main.composite";

const EMPTY_COMPOSITE = {
  version: 1,
  components: [],
};

async function main() {
  const templatesFolder = resolve(`templates`);
  const templatePaths = await list(templatesFolder);
  const templates: Manifest[] = [];
  for (const templateName of templatePaths.filter(($) => !$.startsWith("."))) {
    // load template data
    const basePath = resolve(templatesFolder, templateName);
    const template: TemplateData = await readJson(
      resolve(basePath, `data.json`)
    );

    console.log(`Template: ${template.name}`);

    const files = new Map<string, Buffer>();
    const mappings: Record<string, string> = {};

    let composite = EMPTY_COMPOSITE;
    let templateStatus: "active" | "coming_soon" = "coming_soon";

    if (template.repo) {
      // download .zip contents from template repo
      const response = await fetch(
        `${template.repo}/archive/refs/heads/main.zip`
      );
      const data = await response.arrayBuffer();
      console.log(`Zip file: ${data.byteLength} bytes`);

      const zip = await JSZip.loadAsync(Buffer.from(data));

      const allPaths = Object.keys(zip.files);
      const assetsPath = allPaths.find(($) => $.endsWith("/assets/"));
      if (!assetsPath) {
        throw new Error(`Invalid zip file: could not find "/assets" directory`);
      }

      for (const file of zip
        .folder(assetsPath)!
        .filter((_path, file) => !file.dir)) {
        const path = file.name.slice(file.name.indexOf("/assets/") + 1);
        const data = await file.async("arraybuffer");
        const buffer = Buffer.from(data);
        files.set(path, buffer);
        mappings[path] = await hashV1(buffer);
      }

      if (!files.has(COMPOSITE_PATH)) {
        throw new Error(`Invalid zip: could not find "${COMPOSITE_PATH}"`);
      }

      console.log(`Files: ${files.size}`);

      // generate special files (composite, previews)
      composite = JSON.parse(
        new TextDecoder().decode(files.get("assets/scene/main.composite"))
      );

      templateStatus = "active";
    } else {
      console.log(
        `Template has no repo defined, will be flagged as "coming soon"`
      );
    }

    files.set(
      "preview.png",
      await readBuffer(resolve(basePath, "preview.png"))
    );

    files.set(
      "preview.mp4",
      await readBuffer(resolve(basePath, "preview.mp4"))
    );

    // build manifest
    const sceneId = v4();

    const thumbnail = getStorageUrl(await hashV1(files.get("preview.png")!));

    const video = getStorageUrl(await hashV1(files.get("preview.mp4")!));

    const createdAt = new Date().toISOString();

    const manifest: Manifest = {
      version: 11,
      project: {
        id: template.id,
        title: template.name,
        description: template.description,
        thumbnail,
        sceneId,
        ethAddress: null,
        layout: template.layout,
        createdAt,
        updatedAt: createdAt,
        isTemplate: true,
        video,
        templateStatus,
        isPublic: true,
      },
      scene: {
        sdk6: null,
        sdk7: {
          id: sceneId,
          composite,
          mappings,
        },
      },
    };

    // upload contents to S3

    console.log("Bucket Name:", S3_BUCKET_NAME);
    console.log("Region:", S3_REGION);

    let config: S3ClientConfigType = {
      region: S3_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_ACCESS_SECRET,
      },
    };

    if (AWS_STORAGE_URL) {
      config = {
        ...config,
        endpoint: AWS_STORAGE_URL,
      };

      console.log("Storage URL:", AWS_STORAGE_URL);
    }

    // s3 auth client
    const client = new S3(config);

    // upload queue
    const { default: Queue } = await import("p-queue");
    const queue = new Queue({
      concurrency: Math.max(S3_UPLOAD_CONCURRENCY, 1),
    });
    queue.on("error", (error) => {
      queue.pause();
      throw error;
    });

    async function upload(path: string, file: Buffer) {
      // generate key
      const hash = await hashV1(file);
      const key = `contents/${hash}`;
      try {
        // if head object returns successfully, this file has already been uploaded, it can be skipped
        const head = new HeadObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: key,
        });
        await client.send(head);
      } catch (error) {
        // if head object does not exist, this file needs to be uploaded
        const mimeType = mimeTypes.lookup(path) || "application/octet-stream";
        const upload = new Upload({
          client,
          params: {
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: file,
            ContentType: mimeType,
            CacheControl: "max-age=31536000, immutable",
          },
        });
        await upload.done();
        console.log(`Uploaded "${path}" to "${key}"`);
      }
    }

    // add upload task to queue
    for (const [path, file] of files) {
      queue.add(() => upload(path, file));
    }

    // wait for upload queue to finish
    await queue.onIdle();

    // push template to template list
    templates.push(manifest);
    console.log(`Template "${template.name}" built successfully!`);
  }

  // sort templates
  templates.sort((template1, template2) => {
    if (template1.project.templateStatus === "coming_soon") {
      return 1;
    }

    if (template2.project.templateStatus === "coming_soon") {
      return -1;
    }
    return 0;
  });

  // check project ids are unique
  const ids = new Set<string>();
  for (const template of templates) {
    if (ids.has(template.project.id)) {
      throw new Error(
        `Template "${template.project.title}" has a repeated id!`
      );
    }
    ids.add(template.project.id);
  }

  // write template list as a json in the dist folder
  console.log(`Saving output...`);
  await writeFile(`templates.json`, JSON.stringify({ templates }, null, 2));
  console.log(`Done!`);
}

main().catch(console.error);

const ncc = require("../src/index.js");
const { statSync, writeFileSync, readFileSync, unlinkSync, mkdirSync } = require("fs");
const { promisify } = require("util");
const { relative, join, dirname } = require("path");
const copy = promisify(require("copy"));
const glob = promisify(require("glob"));
const bytes = require("bytes");

const minify = process.argv.some(arg => arg.includes("--no-minify")) ? false : true;
const v8cache = process.argv.some(arg => arg.includes("--no-v8cache")) ? false : true;
const cache = process.argv.some(arg => arg.includes("--no-cache")) ? false : join(__dirname, "..", ".cache");
const nobabel = process.argv.some(arg => arg.includes("--no-babel")) ? true : false;

function safeWriteFileSync(filePath, data, options) {
  if (data) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, data, options);
  }
}

async function main() {
  for (const file of await glob(__dirname + "/../dist/**/*.@(js|cache|ts|txt)")) {
    unlinkSync(file);
  }

  const { code: cli, assets: cliAssets } = await ncc(
    __dirname + "/../src/cli",
    {
      filename: "cli.js",
      externals: ["./index.js"],
      license: 'LICENSES.txt',
      minify,
      cache,
      v8cache,
      nobabel
    }
  );
  checkUnknownAssets('cli', Object.keys(cliAssets));

  const { code: index, assets: indexAssets } = await ncc(
    __dirname + "/../src/index",
    {
      filename: "index.js",
      minify,
      cache,
      v8cache,
      nobabel
    }
  );
  checkUnknownAssets('index', Object.keys(indexAssets).filter(asset =>
    !asset.startsWith('locales/') && asset !== 'worker.js' && asset !== 'index1.js' && asset !== 'minify.js'
  ));

  const { code: relocateLoader, assets: relocateLoaderAssets } = await ncc(
    __dirname + "/../src/loaders/relocate-loader",
    { filename: "relocate-loader.js", minify, cache, v8cache, nobabel }
  );
  checkUnknownAssets('relocate-loader', Object.keys(relocateLoaderAssets));

  const { code: shebangLoader, assets: shebangLoaderAssets } = await ncc(
    __dirname + "/../src/loaders/shebang-loader",
    { filename: "shebang-loader.js", minify, cache, v8cache, nobabel }
  );
  checkUnknownAssets('shebang-loader', Object.keys(shebangLoaderAssets));

  const { code: tsLoader, assets: tsLoaderAssets } = await ncc(
    __dirname + "/../src/loaders/ts-loader",
    {
      filename: "ts-loader.js",
      minify,
      cache,
      v8cache,
      nobabel,
      noAssetBuilds: true
    },
  );
  checkUnknownAssets('ts-loader', Object.keys(tsLoaderAssets).filter(asset => !asset.startsWith('lib/') && !asset.startsWith('typescript/lib')));

  const { code: stringifyLoader, assets: stringifyLoaderAssets } = await ncc(
    __dirname + "/../src/loaders/stringify-loader",
    { filename: "stringify-loader.js", minify, cache, v8cache, nobabel }
  );
  checkUnknownAssets('stringify-loader', Object.keys(stringifyLoaderAssets));

  const { code: sourcemapSupport, assets: sourcemapAssets } = await ncc(
    require.resolve("source-map-support/register"),
    { filename: "sourcemap-register.js", minify, cache, v8cache, nobabel }
  );
  checkUnknownAssets('source-map-support/register', Object.keys(sourcemapAssets));

  // detect unexpected asset emissions from core build
  function checkUnknownAssets (buildName, assets) {
    assets = assets.filter(name => !name.endsWith('.cache') && !name.endsWith('.cache.js') && !name.endsWith('LICENSES.txt') && name !== 'processChild.js' && name !== 'mappings.wasm');
    if (!assets.length) return;
    console.error(`New assets are being emitted by the ${buildName} build`);
    console.log(assets);
  }

  safeWriteFileSync(__dirname + "/../dist/ncc/LICENSES.txt", cliAssets["LICENSES.txt"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/cli.js.cache", cliAssets["cli.js.cache"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/index.js.cache", indexAssets["index.js.cache"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/sourcemap-register.js.cache", sourcemapAssets["sourcemap-register.js.cache"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/relocate-loader.js.cache", relocateLoaderAssets["relocate-loader.js.cache"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/shebang-loader.js.cache", shebangLoaderAssets["shebang-loader.js.cache"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/ts-loader.js.cache", tsLoaderAssets["ts-loader.js.cache"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/stringify-loader.js.cache", stringifyLoaderAssets["stringify-loader.js.cache"]?.source);

  safeWriteFileSync(__dirname + "/../dist/ncc/cli.js.cache.js", cliAssets["cli.js.cache.js"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/index.js.cache.js", indexAssets["index.js.cache.js"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/sourcemap-register.js.cache.js", sourcemapAssets["sourcemap-register.js.cache.js"]?.source);
  safeWriteFileSync(__dirname + "/../src/sourcemap-register.js.cache.js", sourcemapAssets["sourcemap-register.js.cache.js"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/relocate-loader.js.cache.js", relocateLoaderAssets["relocate-loader.js.cache.js"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/shebang-loader.js.cache.js", shebangLoaderAssets["shebang-loader.js.cache.js"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/ts-loader.js.cache.js", tsLoaderAssets["ts-loader.js.cache.js"]?.source);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/stringify-loader.js.cache.js", stringifyLoaderAssets["stringify-loader.js.cache.js"]?.source);

  safeWriteFileSync(__dirname + "/../dist/ncc/cli.js", cli, { mode: 0o777 });
  safeWriteFileSync(__dirname + "/../dist/ncc/index.js", index);
  safeWriteFileSync(__dirname + "/../dist/ncc/typescript.js", readFileSync(__dirname + "/../src/typescript.js"));
  safeWriteFileSync(__dirname + "/../dist/ncc/sourcemap-register.js", sourcemapSupport);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/relocate-loader.js", relocateLoader);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/shebang-loader.js", shebangLoader);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/ts-loader.js", tsLoader);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/stringify-loader.js", stringifyLoader);
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/uncacheable.js", readFileSync(__dirname + "/../src/loaders/uncacheable.js"));
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/empty-loader.js", readFileSync(__dirname + "/../src/loaders/empty-loader.js"));
  safeWriteFileSync(__dirname + "/../dist/ncc/loaders/notfound-loader.js", readFileSync(__dirname + "/../src/loaders/notfound-loader.js"));
  safeWriteFileSync(__dirname + "/../dist/ncc/@@notfound.js", readFileSync(__dirname + "/../src/@@notfound.js"));

  // copy typescript types
  await copy(
    __dirname + "/../node_modules/typescript/lib/*.ts",
    __dirname + "/../dist/ncc/loaders/typescript/lib/"
  );

  for (const file of await glob(__dirname + "/../dist/**/*.js")) {
    console.log(
      `✓ ${relative(__dirname + "/../", file)} (${bytes(statSync(file).size)})`
    );
  }
}

// remove me when node.js makes this the default behavior
process.on("unhandledRejection", e => {
  throw e;
});

main();

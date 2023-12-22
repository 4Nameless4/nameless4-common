import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import serve from "rollup-plugin-serve";
import postcss from "postcss";
import postcssImport from "postcss-import";
import postcssModules from "postcss-modules";
import autoprefixer from "autoprefixer";
import minimist from "minimist";
import { parse, serialize } from "parse5";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { RollupOptions, Plugin, OutputChunk } from "rollup";
import { rimrafSync } from "rimraf";

const argv = minimist(process.argv.slice(2));
const isProduction = !argv.development;
const NODE_ENV = isProduction ? "production" : "development";
process.env.NODE_ENV = NODE_ENV;

function walk<T>(
  data: T | T[],
  call: (data: T, deep: number, pre: T | null) => boolean | void | undefined,
  getChildren: (
    data: T,
    deep: number,
    pre: T | null
  ) => T[] | false | void | undefined
) {
  let deep = 0;
  let pre: T | null = null;
  function _walk(data: T) {
    const result = call(data, deep, pre);
    const children = getChildren(data, deep, pre);
    pre = data;
    deep++;
    if (children && !result) {
      children.forEach((d) => {
        _walk(d);
      });
    }
  }
  if (Array.isArray(data)) {
    data.forEach((d) => {
      _walk(d);
    });
  } else {
    _walk(data);
  }
}

function publicResolve(
  options: {
    public?: string;
    html?: string;
    postcssPlugins?: postcss.AcceptedPlugin[];
  } = {}
): Plugin {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const publicPath = resolve(__dirname, options.public || "./public");
  const rootHTML = resolve(publicPath, "index.html");
  const mainJSPlace = "%${mainjs}$%";

  let htmlStr = "";

  const postPlugins: postcss.AcceptedPlugin[] = (
    [autoprefixer(), postcssImport()] as postcss.AcceptedPlugin[]
  ).concat(options.postcssPlugins || []);
  const cssFiles: Record<
    string,
    { id: string; code: string; css: string; map?: string }
  > = {};

  function resolveHTML() {
    let mainJS = "";
    let html = readFileSync(rootHTML).toString();
    const fragment = parse(html);
    const nodes = fragment.childNodes;
    walk(
      nodes,
      (node) => {
        const nodeName = node.nodeName;
        if (nodeName !== "script") return;
        const attrMap = new Map();
        node.attrs.forEach((d: any, i: number) => {
          attrMap.set(d.name, d);
        });
        if (attrMap.get("type").value === "module") {
          const src = attrMap.get("src");
          const originName = src.value;
          mainJS = resolve(dirname(rootHTML), originName);
          src.value = mainJSPlace;
          return true;
        }
      },
      (d: any) => d.childNodes
    );
    return { html: serialize(fragment), mainJS };
  }

  return {
    name: "publicResolve",
    options(options) {
      rimrafSync("dist");

      const reHTML = resolveHTML();

      if (!reHTML.mainJS) {
        this.error(`Not Found main enter javascript in ${rootHTML}`);
      }

      htmlStr = reHTML.html;
      return Object.assign(options, { input: reHTML.mainJS });
    },
    async transform(code, id) {
      // 主要是解析css文件
      // 这些代码可以直接使用rollup-plugin-postcss
      if (/\.(css|less|sass|postcss|stylus)$/g.test(id)) {
        const _postPlugins: postcss.AcceptedPlugin[] = postPlugins.concat([]);

        let exportCssJSON;
        if (/\.module\.[^.]+$/.test(id)) {
          _postPlugins.push(
            postcssModules({
              getJSON(cssFileName, json, outputFileName) {
                exportCssJSON = json;
              },
            })
          );
        }
        const post = await postcss(_postPlugins).process(code, {
          to: id,
          from: id,
        });

        let _code = `export default ${JSON.stringify(exportCssJSON)}`;

        cssFiles[id] = {
          id,
          code: _code,
          css: post.css,
          map: undefined,
        };

        return {
          code: _code,
          map: {
            mappings: "",
          },
        };
      }
      // 把文件的 process.env.NODE_ENV 替换掉
      // 可以使用 @rollup/plugin-replace 插件
      if (/process.env.NODE_ENV/.test(code)) {
        return code.replace(/process.env.NODE_ENV/g, `"${NODE_ENV}"`);
      }

      return null;
    },
    augmentChunkHash() {
      return JSON.stringify(cssFiles);
    },
    generateBundle(_, bundle) {
      // get entry info
      const entry: OutputChunk | undefined = Object.values(bundle).find(
        (d) => d.type === "chunk" && d.isEntry
      ) as any;
      if (!entry || !htmlStr) return;
      const mainName = entry.fileName.replace(extname(entry.fileName), "");

      // postcss build
      const mainCSSFileName = `assets/${mainName}.css`;
      let cssStr = "";
      Object.values(cssFiles).forEach((d) => {
        cssStr += d.css;
      });
      this.emitFile({
        type: "asset",
        source: cssStr,
        fileName: mainCSSFileName,
      });
      htmlStr = htmlStr.replace(
        /<\/head>/,
        `<link rel="stylesheet" href="${mainCSSFileName}"/>\n</head>`
      );

      // generate public resource
      const dir = readdirSync(publicPath);
      dir.forEach((d) => {
        const filePath = resolve(publicPath, d);
        if (filePath === rootHTML) return;
        const fileStr = readFileSync(filePath).toString();

        const fileName = `assets/${d}`;
        this.emitFile({
          type: "asset",
          fileName,
          source: fileStr,
        });

        htmlStr = htmlStr.replace(d, fileName);
        this.addWatchFile(filePath);
      });

      // generate index html
      htmlStr = htmlStr.replace(mainJSPlace, entry.fileName);
      this.emitFile({
        type: "asset",
        fileName: "index.html",
        source: htmlStr,
      });
      this.addWatchFile(rootHTML);
    },
  };
}

const output = {
  dir: "dist",
  entryFileNames: "[name]-[hash].js",
  sourcemap: !isProduction,
};

const rollup: RollupOptions = {
  output: [
    {
      ...output,
      format: "esm",
    },
    {
      ...output,
      format: "cjs",
    },
  ],
  plugins: [
    publicResolve(),
    nodeResolve(),
    commonjs(),
    typescript({
      sourceMap: !isProduction,
    }),
    json(),
    !isProduction && serve("dist"),
    isProduction && terser(),
  ],
};

export default rollup;

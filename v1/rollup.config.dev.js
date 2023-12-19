import typescript from "rollup-plugin-typescript2";
import progress from "rollup-plugin-progress";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import serve from "rollup-plugin-serve";
import glob from "glob";
// import fs from "fs";
import path from "path";
import chalk from "chalk";

const dir = "./dist";
const fileType = "ts|tsx|js|jsx";

function generateHtmlPlugin() {
  // const htmlMatch = "examples/**/*.html";
  let demos = {};
  // let htmls = [];
  let dir;

  function generateJsDemo(demoPath) {
    if (RegExp(`.demo.(${fileType})$`, "gi").test(demoPath)) {
      const pathsSplit = demoPath.split("\\");
      const fileFullName = pathsSplit[pathsSplit.length - 1];
      const fileName = fileFullName.replace(RegExp(`.(${fileType})$`, "g"), "");
      const name = fileName.replace(/\.demo$/g, "");
      const htmlName = name + ".html";
      const jsName = fileName + ".js";
      const dir = path.dirname(demoPath);
      demos[demoPath] = {
        path: demoPath,
        fileFullName,
        fileName,
        name,
        htmlName,
        jsName,
        dir,
      };

      let htmlSource = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Title</title>
          <link rel="stylesheet" href="/index.css" />
        </head>
        <body>
          <div id="root"></div>
          <script src="./${jsName}" type="module"></script>
        </body>
      </html>`;

      this.emitFile({
        type: "asset",
        fileName: htmlName,
        source: htmlSource,
      });
    }
  }

  // function generateHTMLDemo(htmlPath) {
  //   if (/\.html$/g.test(htmlPath)) {
  //     const pathsSplit = htmlPath.split("\\");
  //     const fileFullName = pathsSplit[pathsSplit.length - 1];
  //     const fileName = fileFullName.replace(/\.html$/g, "");
  //     const name = fileName;
  //     const htmlName = name + ".html";
  //     const jsName = fileName + ".js";
  //     const dir = path.dirname(htmlPath);
  //     return (demos[htmlPath] = {
  //       path: htmlPath,
  //       fileFullName,
  //       fileName,
  //       name,
  //       htmlName,
  //       jsName,
  //       dir,
  //     });
  //   }
  // }

  return {
    name: "generate-html",
    options(options) {
      demos = {};
      const input = glob.sync(options.input);

      // 以下是html和.js的格式的demo，不是.demo.js
      // glob.sync(htmlMatch).forEach((hl) => {
      //   const html = generateHTMLDemo(path.join(__dirname, hl));
      //   htmls.push(html);
      //   const scriptPath = path.join(html.dir, html.fileName + ".ts");
      //   if (html && fs.existsSync(scriptPath)) {
      //     input.push(hl.replace(".html", ".ts"));
      //   }
      // });
      dir = options.input.split("/")[0];
      return {
        ...options,
        input,
      };
    },
    buildStart(options) {
      this.addWatchFile(dir);
    },
    load(path) {
      generateJsDemo.call(this, path);
    },
    generateBundle() {
      // htmls.forEach((html) => {
      //   const fileFullName = html.fileFullName;
      //   const filePath = html.path;
      //   if (fs.existsSync(filePath)) {
      //     const f = fs.readFileSync(filePath, { encoding: "utf-8" });
      //     this.emitFile({
      //       type: "asset",
      //       fileName: fileFullName,
      //       source: f,
      //     });
      //   }
      // });

      this.emitFile({
        type: "asset",
        fileName: "examples.js",
        source: `export default ${JSON.stringify(demos)}`,
      });
    },
  };
}

const rollup = {
  input: `examples/**/*.demo.?(${fileType})`,
  output: {
    dir: dir,
    format: "esm",
    sourcemap: true,
  },
  plugins: [
    generateHtmlPlugin(),
    nodeResolve(),
    commonjs(),
    progress(),
    json(),
    typescript(),
    serve({
      contentBase: ["./public", "./dist"],
      port: 8000,
      onListening: function (server) {
        const address = server.address();
        const host = address.address === "::" ? "localhost" : address.address;
        // by using a bound function, we can access options as `this`
        const protocol = this.https ? "https" : "http";

        console.log();
        console.log(
          chalk.blue("***************************************************")
        );
        console.log();
        console.log("        serve start listen on:");
        console.log(
          chalk.green(`        ${protocol}://${host}:${address.port}`)
        );
        console.log();
        console.log(
          chalk.blue("***************************************************")
        );
        console.log();
      },
    }),
  ],
  watch: {
    clearScreen: false,
    // buildDelay: 1000,
  },
  // external: ["d3"],
};

export default rollup;

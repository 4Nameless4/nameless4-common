import examples from "./examples.js";

const list = document.querySelector("#list");

for (const id in examples) {
  const { name, htmlName, jsName } = examples[id]
  const item = document.createElement("div");
  const link = document.createElement("a");

  item.classList.add("item");
  link.classList.add("link");

  link.text = name;

  link.href = `./${htmlName}`;

  link.target = "demoContent";

  item.appendChild(link);
  list.appendChild(item);
}

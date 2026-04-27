// Build: produce apac.html, americas.html, emea.html from region-template.html
// by injecting the JSON data inline (so the page works on file:// and GitHub Pages without fetch)
const fs = require("fs");
const path = require("path");

const ROOT = "/home/claude/uat-dashboard";
const tpl = fs.readFileSync(path.join(ROOT, "region-template.html"), "utf8");

const regions = ["apac", "americas", "emea"];
const titles = {
  apac: "APAC UAT Progress · Tate & Lyle",
  americas: "Americas UAT Progress · Tate & Lyle",
  emea: "EMEA UAT Progress · Tate & Lyle",
};
const breadcrumbs = {
  apac: "APAC",
  americas: "Americas",
  emea: "EMEA",
};
const headings = {
  apac: "APAC UAT Dashboard",
  americas: "Americas UAT Dashboard",
  emea: "EMEA UAT Dashboard",
};

const allData = {};
regions.forEach(r => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data", r + ".json"), "utf8"));
  allData[r] = data;
  let html = tpl;

  // Inject data via the placeholder
  html = html.replace(/\/\*INJECT_DATA_apac\*\/\s*null/, JSON.stringify(data, null, 2));

  // Replace REGION_CODE
  html = html.replace(/const REGION_CODE = "apac";/, `const REGION_CODE = "${r}";`);

  // Replace title
  html = html.replace(/<title>APAC UAT Progress · Tate &amp; Lyle<\/title>/, `<title>${titles[r]}</title>`);

  // Replace breadcrumb + heading
  html = html.replace(/<span>APAC<\/span>/, `<span>${breadcrumbs[r]}</span>`);
  html = html.replace(/APAC UAT Dashboard/, headings[r]);

  fs.writeFileSync(path.join(ROOT, r + ".html"), html);
  console.log("Wrote:", r + ".html");
});

// Build index.html
const indexTpl = fs.readFileSync(path.join(ROOT, "index-template.html"), "utf8");
const indexHtml = indexTpl.replace(/\/\*INJECT_ALL_DATA\*\/\s*null/, JSON.stringify(allData, null, 2));
fs.writeFileSync(path.join(ROOT, "index.html"), indexHtml);
console.log("Wrote: index.html");

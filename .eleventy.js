const crs = require('./crs/crs.js');
const { DateTime } = require('luxon');

module.exports = async function (eleventyConfig) {

  // https://www.11ty.dev/docs/languages/markdown/#indented-code-blocks
  eleventyConfig.amendLibrary("md", (mdLib) => mdLib.enable("code"));

  // const pageAssetsPlugin = require('eleventy-plugin-page-assets');
  let pageAssetsPlugin = await import('eleventy-plugin-page-assets');
  pageAssetsPlugin = pageAssetsPlugin.default || pageAssetsPlugin;

  // https://github.com/victornpb/eleventy-plugin-page-assets
  eleventyConfig.addPlugin(pageAssetsPlugin, {
    mode: "directory",
    assetsMatching: "*.png|*.PNG|*.jpg|*.JPG|*.gif|*.GIF|*.cr|*.nr|*.txt",
    postsMatching: "**/*.md",
    hashAssets: false,
    recursive: true,
    silent: true,
  });

  // This replaces the {{ xyz | url }} filter by applying pathPrefix properly
  // let { HtmlBasePlugin } = await import("@11ty/eleventy");
  // HtmlBasePlugin = HtmlBasePlugin.default || HtmlBasePlugin;
  // eleventyConfig.addPlugin(HtmlBasePlugin);

  // This currently works best
  // It replaces all links with links relative to the current file
  eleventyConfig.addPlugin(relativeLinks);

  eleventyConfig.addFilter('dateIso', date => {
    if (!date) return '';
    try {
      const dt = date instanceof Date ? DateTime.fromJSDate(date) : DateTime.fromISO(String(date));
      if (dt.isValid) return dt.toUTC().toISO();
      // fallback to native parse
      const d2 = new Date(String(date));
      return isNaN(d2) ? '' : DateTime.fromJSDate(d2).toUTC().toISO();
    } catch (e) { return ''; }
  });

  // dateReadable: server-side formatted date using the provided locale (e.g. page.locale)
  // Usage: {{ page.date | dateReadable(page.locale) }} — falls back to site locale or 'en'
  eleventyConfig.addFilter('dateReadable', (date, locale) => {
    if (!date) return '';
    let dt = date instanceof Date ? DateTime.fromJSDate(date) : DateTime.fromISO(String(date));
    if (!dt.isValid) dt = DateTime.fromJSDate(new Date(String(date)));

    const site = require('./_data/site.json');
    const useLocale = locale || site.locale || 'en';
    return dt.setLocale(useLocale).toLocaleString(DateTime.DATE_FULL);
  });

  eleventyConfig.addShortcode('excerpt', article => extractExcerpt(article));

  // Folders to copy to output folder
  eleventyConfig.addPassthroughCopy("css");

  crs(eleventyConfig);

  // all reports go here
  eleventyConfig.addPassthroughCopy("reports");

};

module.exports.config = {
  // pathPrefix: "/tutorials",
}

function extractExcerpt(article) {
  if (!article.hasOwnProperty('templateContent')) {
    console.warn('Failed to extract excerpt: Document has no property "templateContent".');
    return null;
  }

  let excerpt = null;
  const content = article.templateContent;

  // The start and end separators to try and match to extract the excerpt
  const separatorsList = [
    { start: '<!-- Excerpt Start -->', end: '<!-- Excerpt End -->' },
    { start: '<p>', end: '</p>' }
  ];

  separatorsList.some(separators => {
    const startPosition = content.indexOf(separators.start);

    // This end position could use "lastIndexOf" to return all the paragraphs rather than just the first
    // paragraph when matching is on "<p>" and "</p>".
    const endPosition = content.indexOf(separators.end);

    if (startPosition !== -1 && endPosition !== -1) {
      excerpt = content.substring(startPosition + separators.start.length, endPosition).trim();
      return true; // Exit out of array loop on first match
    }
  });

  return excerpt;
}


/** Referring to HtmlBasePlugin.js
 *
 *  This plugin tries to make all URLs in the HTML output relative to the page.
 *
 *  Useful for:
 *  * browsing via file://
 *  * gh-pages in subdirectory repo
 *  * unsure where in the directory structure the site will be hosted
 *
 *  We're expecting the internal links to start with "/"
 *
 *  todo?
 *  * option to include "index.html" for those directory links, for extra file:// compat
 *
 */

// import path from "path";
const path = require("path");

function relativeLinks(eleventyConfig) {
  // Apply to all HTML output in your project
  eleventyConfig.htmlTransformer.addUrlTransform(
    "html",
    function makeUrlRelative(urlInMarkup) {
      // Skip empty URLs, non-root-relative URLs, and dev server image transform URLs
      if (
        !urlInMarkup
        || !urlInMarkup.startsWith("/")
        || urlInMarkup.startsWith("/.11ty/")
        || urlInMarkup.startsWith("//")
      ) {
        if (urlInMarkup.endsWith("/") && urlInMarkup.startsWith("/")) {
          return urlInMarkup + 'index.html';
        }
        if (urlInMarkup === "..") return "../index.html";
        return urlInMarkup;
      }

      // Get base directory path (keep trailing slash for index pages)
      const fromDir = this.url.endsWith("/") ? this.url : path.dirname(this.url);

      let relativePath = path.relative(fromDir, urlInMarkup);

      // Add ./ for same-directory references
      if (!relativePath.startsWith(".")) {
        relativePath = "./" + relativePath;
      }

      // Preserve trailing slash from original URL
      if (urlInMarkup.endsWith("/") && !relativePath.endsWith("/")) {
        relativePath += "/";
      }
      if (relativePath.endsWith("/"))
        return relativePath + "index.html";

      return relativePath;
    },
    {
      priority: -1, // run last last (after PathToUrl)
    },
  );
}
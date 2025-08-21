# Eressea Tutorial 2024

These are the diaries for the 2024 Eressea Tutorial. 

## How to add your diary

### Create your own fork of the repository

- Create a github account.

- Fork this repository by clicking on the [Fork Link in Github](https://github.com/eressea/tutorials/fork). This will create your private copy of the whole thing.

### Editing your content

- You can edit it directly on github or *clone* it to your computer and edit it there. Cloning requires more steps, but is ultimately more flexible. It requires you to learn a bit about version control with [git](https://git-scm.com/docs/gittutorial) and [github](https://docs.github.com/en/get-started/start-your-journey/hello-world)

- Create a subdirectory for your faction, for example 'dragonborns' (replace dragonborns below with the name of your directory).

- Copy the file called 'index.njk' from the 'template' directory into your subdirectory:

```
---
layout: overview-layout.njk
title: Not Goblins!
override:tags: ["race"]
pagination:
  data: collections.nogoblin
  size: 8
  reverse: false
  alias: posts
---
...
```

Change the title as you wish and 'nogoblin' to 'dragonborns'.

- If you want to create just one big file, replace everything below the second '---' with your content. This is not recommended if you want to add a lot of text. The content is [Markdown](https://www.markdownguide.org/), a text file format that let's you add basic formatting like headings, links, images. You could also use html directly. Then you would create an index.html file instead. HTML is less recommended.

- If you have more to say, you should split your diary into multiple files. In that case, just add a short intro below the '---'. Also copy 'Auswertung_XX.md' from the template directory into your subdirectory. You may rename them as you wish, for example to week_01.md, week_02.md, ... and so forth.

- Also copy the file template.json to your directory and rename it to dragonborns.json.
```
{
    "author": "enno",
    "layout": "post-layout.njk",
    "tags": "nogoblin",
    "locale": "de"
}
```
- Change the author to your name and "nogoblin" to "dragonborns".

- Change the locale to en if you want to write in English.

- Edit every Auswertung_XX.md:
```
---
title: "Dragonborn: Round 1"
date: 2024-03-17
---
## Was passiert ist
...
## Unser Plan
...
```

This file consists of the 'front matter' between the lines starting with '---'. It contains some meta data that will be used for presenting your files nicely.

- Change the title
- Change the date line. The files will be ordered by the 'date' field, so make sure to get that right.
- Write your text below the second '---' line

- If you're editing directly in github, 'commit' your changes using the github interface. You can commit directly to your 'main' branch.

### Including links to files

If you use images, .cr, .nr, or .txt files in your text they should be automatically handled. 

If this does not work, it may help to instead create a subdirectory `/reports/dragonborns` (at the project root, not inside your dragonborns directory) and copy them there. Now they get copied to the site and you can link to them as `[my first report](/reports/dragonborns/1-drag.cr)`.

### Including cr maps

With the 'shortcode' crmap, readnr, showorders etc. you can include a cr directly into your file like so:

    {% crmap './reports/dragonborns/123-drag.cr' %}

    {% orderfile '/reports/template/befehle-42.txt' %}

    {% readnr '/reports/template/334-42.nr' %} 
    {% shownr 'intro' %}

See template/Auswertung_01.md for more details and examples.

### Seeing your content

- If you have cloned your repository and are using a Linux system, you can run 
```
npm install
npm run serve
```
in a terminal. Watch the terminal for error messages. If all went well, you can then see the generated pages at [http://localhost:8080/](http://localhost:8080/) (your port may vary).


### Uploading your content

- If you have cloned the repository to your computer, you must ['add'](https://git-scm.com/docs/gittutorial)  and ['commit'](https://git-scm.com/docs/gittutorial) your changes, then 'push' them to your repository.

- Optional: Activate github actions and github-pages. TODO

- If you have pushed your changes or commited them on github and you are happy with them, create a ['pull request'](https://github.blog/developer-skills/github/beginners-guide-to-github-creating-a-pull-request/) for the actual eressea repository (sometimes called the 'upstream repository'). If you have changes, you should see a line like "This branch is 1 commit ahead of eressea/tutorials:main' on github. Use the 'contribute' button to 'Open a pull request'. Write a short comment explaining your changes and 'Create pull request'. This will notifiy the owners of the upstream repo to review your changes. If they like them, they will 'merge' them and they can be watched online. They may also have comments or questions or ask you for changes before actually merging them.



### Done!

You can see the current state of the tutorial on https://eressea.github.io/tutorials/.


## eleventy-blog

We use [11ty](https://www.11ty.dev/) for creating the documentation. 

See here for an example using eleventy:

### Creating A Blog With Eleventy
[https://keepinguptodate.com/pages/2019/06/creating-blog-with-eleventy/](https://keepinguptodate.com/pages/2019/06/creating-blog-with-eleventy/)

A demo of the blog is hosted on Netlify:  
[https://dazzling-almeida-ca0492.netlify.com/](https://dazzling-almeida-ca0492.netlify.com/)

### Branches
This repo contains several branches that allow you to checkout the code at various stages of development.

### How do I run the site?
```
npm install
npm run serve
```

Then access the site with the URL [http://localhost:8080/](http://localhost:8080/) (your port may vary).

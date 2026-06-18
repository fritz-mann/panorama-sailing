export async function onRequest(context) {
  const { request } = context;

  const acceptLang = request.headers.get('Accept-Language') || 'en';
  const isFrench = acceptLang.toLowerCase().startsWith('fr');
  const lang = isFrench ? 'fr' : 'en';

  const ui = {
    en: {
      title: "Captain's Journal — Panorama Sailing",
      sectionTag: "Captain's Journal",
      headingStart: "All ",
      headingEm: "Posts",
      backToSite: "\u2190 Back to Site",
      searchPlaceholder: "Search posts\u2026",
      noResults: "No posts found matching your search.",
      noPosts: "No posts yet \u2014 check back soon!",
      readPost: "Read Post \u2192",
      rights: "All rights reserved.",
      posts: "posts",
      post: "post",
      loading: "Loading posts\u2026",
    },
    fr: {
      title: "Journal du Capitaine \u2014 Panorama Sailing",
      sectionTag: "Journal du Capitaine",
      headingStart: "Tous les ",
      headingEm: "Articles",
      backToSite: "\u2190 Retour au Site",
      searchPlaceholder: "Rechercher des articles\u2026",
      noResults: "Aucun article trouv\u00e9 pour cette recherche.",
      noPosts: "Aucun article pour l'instant \u2014 revenez bient\u00f4t !",
      readPost: "Lire \u2192",
      rights: "Tous droits r\u00e9serv\u00e9s.",
      posts: "articles",
      post: "article",
      loading: "Chargement\u2026",
    }
  };
  const t = ui[lang];
  const dateLocale = lang === 'fr' ? 'fr-CA' : 'en-CA';

  try {
    const repoResponse = await fetch(
      'https://api.github.com/repos/fritz-mann/panorama-sailing/contents/logbook',
      {
        headers: {
          'User-Agent': 'panorama-sailing-site',
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!repoResponse.ok) throw new Error('Could not fetch logbook folder');

    const files = await repoResponse.json();
    const mdFiles = files.filter(f => f.name.endsWith('.md') && f.name !== '.gitkeep');

    const posts = await Promise.all(
      mdFiles.map(async (file) => {
        try {
          const fileResponse = await fetch(file.download_url);
          const raw = await fileResponse.text();
          const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
          if (!match) return null;
          const frontmatter = match[1];
          const body = match[2].trim();
          const data = {};
          frontmatter.split('\n').forEach(line => {
            const idx = line.indexOf(':');
            if (idx === -1) return;
            const key = line.slice(0, idx).trim();
            let value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            data[key] = value;
          });
          const slug = file.name.replace('.md', '');
          const cleanBody = body.replace(/[#*`_\[\]()]/g, '').replace(/\n/g, ' ');
          const excerpt = cleanBody.substring(0, 200).trim() + '\u2026';
          const searchText = ((data.title || '') + ' ' + cleanBody).toLowerCase();
          return {
            slug,
            title: data.title || 'Untitled',
            date: data.date || '',
            image: data.image || '',
            published: data.published !== 'false',
            excerpt,
            searchText,
          };
        } catch (e) {
          return null;
        }
      })
    );

    const publishedPosts = posts
      .filter(p => p && p.published)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const formattedPosts = publishedPosts.map(p => ({
      slug: p.slug,
      title: p.title,
      date: p.date ? new Date(p.date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }) : '',
      image: p.image,
      excerpt: p.excerpt,
      searchText: p.searchText,
    }));

    // Encode as base64 using btoa (Cloudflare Workers compatible)
    const postsJson = JSON.stringify(formattedPosts);
    const postsBase64 = btoa(unescape(encodeURIComponent(postsJson)));

    // Build the page using string concatenation to avoid template literal conflicts
    const year = new Date().getFullYear();

    let page = '<!DOCTYPE html>';
    page += '<html lang="' + lang + '">';
    page += '<head>';
    page += '<meta charset="UTF-8" />';
    page += '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
    page += '<title>' + t.title + '</title>';
    page += '<meta name="description" content="Stories, travels, and moments from life on the water." />';
    page += '<meta property="og:type" content="website" />';
    page += '<meta property="og:url" content="https://panoramasailing.com/logbook" />';
    page += '<meta property="og:title" content="' + t.title + '" />';
    page += '<meta property="og:image" content="https://images.panoramasailing.com/hero.jpg" />';
    page += '<script async src="https://www.googletagmanager.com/gtag/js?id=G-SDJ0B3XCJ5"></' + 'script>';
    page += '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("consent","default",{analytics_storage:"denied"});gtag("js",new Date());gtag("config","G-SDJ0B3XCJ5");</' + 'script>';
    page += '<link rel="preconnect" href="https://fonts.googleapis.com" />';
    page += '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />';
    page += '<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@500;700&display=swap" rel="stylesheet" />';
    page += '<style>';
    page += ':root{--navy:#0a1628;--deep:#061020;--ocean:#0e3460;--mid:#1a5c8a;--sky:#2d8fc4;--foam:#a8d5f0;--gold:#0e9e9e;--gold-lt:#1dc8c8;--white:#f5f0eb;--text:#c8d8e4;--muted:#6a8fa8;}';
    page += '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}';
    page += 'body{background:var(--deep);color:var(--white);font-family:"Barlow",sans-serif;font-weight:300;}';
    page += 'a{color:inherit;text-decoration:none;}';
    page += 'nav{background:rgba(6,16,32,0.97);border-bottom:1px solid rgba(45,143,196,0.15);display:flex;align-items:center;justify-content:space-between;padding:1rem 4rem;position:sticky;top:0;z-index:100;}';
    page += '.nav-logo{font-family:"Bebas Neue","Barlow Condensed",sans-serif;font-weight:400;font-size:1.5rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--white);}';
    page += '.nav-logo span{color:var(--gold);}';
    page += '.nav-back{font-family:"Barlow Condensed",sans-serif;font-size:0.82rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:0.5rem;transition:gap 0.2s;}';
    page += '.nav-back:hover{gap:0.8rem;}';
    page += '.archive-header{background:var(--navy);padding:5rem 4rem 3rem;border-bottom:1px solid rgba(45,143,196,0.15);}';
    page += '.section-tag{font-family:"Barlow Condensed",sans-serif;font-weight:500;font-size:0.75rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:0.8rem;margin-bottom:0.8rem;}';
    page += '.section-tag::before{content:"";display:block;width:24px;height:1px;background:var(--gold);}';
    page += '.archive-title{font-family:"Playfair Display",serif;font-size:clamp(2rem,5vw,3.5rem);font-weight:700;color:var(--white);line-height:1.1;}';
    page += '.archive-title em{color:var(--sky);font-style:italic;}';
    page += '.archive-meta{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-top:1.5rem;}';
    page += '.archive-count{font-size:0.88rem;color:var(--muted);}';
    page += '.search-wrap{position:relative;}';
    page += '.search-input{background:rgba(10,22,40,0.8);border:1px solid rgba(45,143,196,0.25);color:var(--white);padding:0.7rem 1rem 0.7rem 2.8rem;font-family:"Barlow",sans-serif;font-size:0.88rem;font-weight:300;outline:none;transition:border-color 0.2s;width:280px;}';
    page += '.search-input:focus{border-color:rgba(45,143,196,0.7);}';
    page += '.search-input::placeholder{color:var(--muted);}';
    page += '.search-icon{position:absolute;left:0.85rem;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;}';
    page += '.archive-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;padding:4rem;max-width:1400px;margin:0 auto;min-height:300px;}';
    page += '.post-card{background:var(--navy);border:1px solid rgba(45,143,196,0.15);overflow:hidden;transition:border-color 0.3s,transform 0.3s;display:flex;flex-direction:column;}';
    page += '.post-card:hover{border-color:rgba(14,158,158,0.4);transform:translateY(-4px);}';
    page += '.post-card-img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;}';
    page += '.post-card-img-placeholder{width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,var(--ocean),var(--mid));display:flex;align-items:center;justify-content:center;font-size:3rem;color:rgba(168,213,240,0.2);}';
    page += '.post-card-body{padding:1.8rem;flex:1;display:flex;flex-direction:column;}';
    page += '.post-card-date{font-family:"Barlow Condensed",sans-serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--gold);margin-bottom:0.6rem;}';
    page += '.post-card-title{font-family:"Playfair Display",serif;font-size:1.2rem;font-weight:700;color:var(--white);margin-bottom:0.8rem;line-height:1.3;}';
    page += '.post-card-excerpt{font-size:0.88rem;line-height:1.75;color:var(--text);flex:1;}';
    page += '.post-card-link{display:inline-flex;align-items:center;gap:0.4rem;margin-top:1.2rem;font-family:"Barlow Condensed",sans-serif;font-size:0.75rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--gold);transition:gap 0.2s;}';
    page += '.post-card:hover .post-card-link{gap:0.8rem;}';
    page += '.no-results{grid-column:span 3;text-align:center;padding:4rem 2rem;color:var(--muted);font-size:0.95rem;}';
    page += 'footer{background:var(--deep);border-top:1px solid rgba(45,143,196,0.15);padding:2.5rem 4rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;}';
    page += '.footer-logo{font-family:"Bebas Neue","Barlow Condensed",sans-serif;font-size:1.1rem;letter-spacing:0.12em;text-transform:uppercase;}';
    page += '.footer-logo span{color:var(--gold);}';
    page += '.footer-copy{font-size:0.78rem;color:var(--muted);}';
    page += '@media(max-width:900px){nav{padding:1rem 1.5rem;}.archive-header{padding:3rem 1.5rem 2.5rem;}.archive-grid{grid-template-columns:repeat(2,1fr);padding:2rem 1.5rem;}.search-input{width:220px;}footer{padding:2rem 1.5rem;flex-direction:column;text-align:center;}}';
    page += '@media(max-width:600px){.archive-grid{grid-template-columns:1fr;}.search-input{width:100%;}.archive-meta{flex-direction:column;align-items:flex-start;}.search-wrap{width:100%;}}';
    page += '</style>';
    page += '</head>';
    page += '<body>';
    page += '<nav>';
    page += '<a href="/" class="nav-logo">Panorama<span>\u22c4</span>Sailing</a>';
    page += '<a href="/" class="nav-back">' + t.backToSite + '</a>';
    page += '</nav>';
    page += '<div class="archive-header">';
    page += '<div class="section-tag">' + t.sectionTag + '</div>';
    page += '<h1 class="archive-title">' + t.headingStart + '<em>' + t.headingEm + '</em></h1>';
    page += '<div class="archive-meta">';
    page += '<p class="archive-count" id="post-count"></p>';
    page += '<div class="search-wrap">';
    page += '<svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    page += '<input type="text" class="search-input" id="search-input" placeholder="' + t.searchPlaceholder + '" />';
    page += '</div>';
    page += '</div>';
    page += '</div>';
    page += '<div class="archive-grid" id="posts-grid">';
    page += '<div class="no-results" style="color:var(--muted);">' + t.loading + '</div>';
    page += '</div>';
    page += '<footer>';
    page += '<div class="footer-logo">Panorama<span>\u22c4</span>Sailing</div>';
    page += '<p class="footer-copy">&copy; ' + year + ' Panorama Sailing. ' + t.rights + '</p>';
    page += '</footer>';
    page += '<div id="posts-data" data-posts="' + postsBase64 + '" style="display:none;"></div>';
    page += '<script>';
    page += '(function(){';
    page += 'try{';
    page += 'var el=document.getElementById("posts-data");';
    page += 'var encoded=el.getAttribute("data-posts");';
    page += 'var allPosts=JSON.parse(decodeURIComponent(escape(atob(encoded))));';
    page += 'var readPost=' + JSON.stringify(t.readPost) + ';';
    page += 'var noResultsText=' + JSON.stringify(t.noResults) + ';';
    page += 'var noPostsText=' + JSON.stringify(t.noPosts) + ';';
    page += 'var postsLabel=' + JSON.stringify(t.posts) + ';';
    page += 'var postLabel=' + JSON.stringify(t.post) + ';';
    page += 'function esc(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}';
    page += 'function render(posts){';
    page += 'var grid=document.getElementById("posts-grid");';
    page += 'var count=document.getElementById("post-count");';
    page += 'if(!grid||!count)return;';
    page += 'count.textContent=posts.length+" "+(posts.length!==1?postsLabel:postLabel);';
    page += 'if(posts.length===0){grid.innerHTML="<div class=\\"no-results\\">"+(allPosts.length===0?noPostsText:noResultsText)+"</div>";return;}';
    page += 'grid.innerHTML=posts.map(function(p){';
    page += 'var img=p.image?"<img class=\\"post-card-img\\" src=\\""+esc(p.image)+"\\" alt=\\""+esc(p.title)+"\\" onerror=\\"this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';\\" /><div class=\\"post-card-img-placeholder\\" style=\\"display:none;\\">&#9945;</div>":"<div class=\\"post-card-img-placeholder\\">&#9945;</div>";';
    page += 'return"<a href=\\"/logbook/"+esc(p.slug)+"\\" class=\\"post-card\\">"+img+"<div class=\\"post-card-body\\"><div class=\\"post-card-date\\">"+esc(p.date)+"</div><div class=\\"post-card-title\\">"+esc(p.title)+"</div><p class=\\"post-card-excerpt\\">"+esc(p.excerpt)+"</p><span class=\\"post-card-link\\">"+readPost+"</span></div></a>";';
    page += '}).join("");';
    page += '}';
    page += 'function filter(q){';
    page += 'q=q.toLowerCase().trim();';
    page += 'if(!q){render(allPosts);return;}';
    page += 'render(allPosts.filter(function(p){return(p.searchText&&p.searchText.indexOf(q)!==-1)||(p.title&&p.title.toLowerCase().indexOf(q)!==-1);}));';
    page += '}';
    page += 'render(allPosts);';
    page += 'var inp=document.getElementById("search-input");';
    page += 'if(inp)inp.addEventListener("input",function(){filter(this.value);});';
    page += '}catch(e){';
    page += 'var g=document.getElementById("posts-grid");';
    page += 'if(g)g.innerHTML="<div class=\\"no-results\\">Error: "+e.message+"</div>";';
    page += '}';
    page += '})();';
    page += '</' + 'script>';
    page += '</body>';
    page += '</html>';

    return new Response(page, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=300',
      },
    });

  } catch (err) {
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Error</title></head><body style="background:#061020;color:#f5f0eb;font-family:sans-serif;padding:2rem;"><h1>Error loading posts</h1><p>' + err.message + '</p><a href="/" style="color:#0e9e9e;">\u2190 Back to site</a></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

export async function onRequest(context) {
  const { request } = context;

  // Detect language from browser
  const acceptLang = request.headers.get('Accept-Language') || 'en';
  const isFrench = acceptLang.toLowerCase().startsWith('fr');
  const lang = isFrench ? 'fr' : 'en';

  const ui = {
    en: {
      title: "Captain's Journal — Panorama Sailing",
      sectionTag: "Captain's Journal",
      heading: "All <em>Posts</em>",
      backToSite: "← Back to Site",
      searchPlaceholder: "Search posts…",
      noResults: "No posts found matching your search.",
      noPosts: "No posts yet — check back soon!",
      readPost: "Read Post →",
      rights: "All rights reserved.",
      posts: "posts",
      post: "post",
    },
    fr: {
      title: "Journal du Capitaine — Panorama Sailing",
      sectionTag: "Journal du Capitaine",
      heading: "Tous les <em>Articles</em>",
      backToSite: "← Retour au Site",
      searchPlaceholder: "Rechercher des articles…",
      noResults: "Aucun article trouvé pour cette recherche.",
      noPosts: "Aucun article pour l'instant — revenez bientôt !",
      readPost: "Lire →",
      rights: "Tous droits réservés.",
      posts: "articles",
      post: "article",
    }
  };
  const t = ui[lang];
  const dateLocale = lang === 'fr' ? 'fr-CA' : 'en-CA';

  try {
    const repoResponse = await fetch(
      `https://api.github.com/repos/fritz-mann/panorama-sailing/contents/logbook`,
      {
        headers: {
          "User-Agent": "panorama-sailing-site",
          "Accept": "application/vnd.github.v3+json",
        },
      }
    );

    if (!repoResponse.ok) throw new Error("Could not fetch logbook folder");

    const files = await repoResponse.json();
    const mdFiles = files.filter(f => f.name.endsWith(".md") && f.name !== ".gitkeep");

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
          frontmatter.split("\n").forEach(line => {
            const idx = line.indexOf(":");
            if (idx === -1) return;
            const key = line.slice(0, idx).trim();
            let value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
            data[key] = value;
          });
          const slug = file.name.replace(".md", "");
          const cleanBody = body.replace(/[#*`_\[\]()]/g, "").replace(/\n/g, " ");
          const excerpt = cleanBody.substring(0, 200).trim() + "…";
          const searchText = ((data.title || "") + " " + cleanBody).toLowerCase();
          return {
            slug,
            title: data.title || "Untitled",
            date: data.date || "",
            image: data.image || "",
            published: data.published !== "false",
            excerpt,
            searchText,
          };
        } catch(e) {
          return null;
        }
      })
    );

    const publishedPosts = posts
      .filter(p => p && p.published)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Format dates server-side to avoid client locale issues
    const formattedPosts = publishedPosts.map(p => ({
      slug: p.slug,
      title: p.title,
      date: p.date ? new Date(p.date).toLocaleDateString(dateLocale, { year:'numeric', month:'long', day:'numeric' }) : '',
      image: p.image,
      excerpt: p.excerpt,
      searchText: p.searchText,
    }));

    // Safely encode posts as base64 to avoid any HTML/JS escaping issues
    const postsBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(formattedPosts))));

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.title}</title>
  <meta name="description" content="Stories, travels, and moments from life on the water." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://panoramasailing.com/logbook" />
  <meta property="og:title" content="${t.title}" />
  <meta property="og:image" content="https://images.panoramasailing.com/hero.jpg" />

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-SDJ0B3XCJ5"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', { analytics_storage: 'denied' });
    gtag('js', new Date());
    gtag('config', 'G-SDJ0B3XCJ5');
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --navy:#0a1628; --deep:#061020; --ocean:#0e3460; --mid:#1a5c8a;
      --sky:#2d8fc4; --foam:#a8d5f0; --gold:#0e9e9e; --gold-lt:#1dc8c8;
      --white:#f5f0eb; --text:#c8d8e4; --muted:#6a8fa8;
    }
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { background:var(--deep); color:var(--white); font-family:'Barlow',sans-serif; font-weight:300; }
    a { color:inherit; text-decoration:none; }
    nav { background:rgba(6,16,32,0.97); border-bottom:1px solid rgba(45,143,196,0.15); display:flex; align-items:center; justify-content:space-between; padding:1rem 4rem; position:sticky; top:0; z-index:100; }
    .nav-logo { font-family:'Bebas Neue','Barlow Condensed',sans-serif; font-weight:400; font-size:1.5rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--white); }
    .nav-logo span { color:var(--gold); }
    .nav-back { font-family:'Barlow Condensed',sans-serif; font-size:0.82rem; letter-spacing:0.14em; text-transform:uppercase; color:var(--gold); display:flex; align-items:center; gap:0.5rem; transition:gap 0.2s; }
    .nav-back:hover { gap:0.8rem; }
    .archive-header { background:var(--navy); padding:5rem 4rem 3rem; border-bottom:1px solid rgba(45,143,196,0.15); }
    .section-tag { font-family:'Barlow Condensed',sans-serif; font-weight:500; font-size:0.75rem; letter-spacing:0.3em; text-transform:uppercase; color:var(--gold); display:flex; align-items:center; gap:0.8rem; margin-bottom:0.8rem; }
    .section-tag::before { content:''; display:block; width:24px; height:1px; background:var(--gold); }
    .archive-title { font-family:'Playfair Display',serif; font-size:clamp(2rem,5vw,3.5rem); font-weight:700; color:var(--white); line-height:1.1; }
    .archive-title em { color:var(--sky); font-style:italic; }
    .archive-meta { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-top:1.5rem; }
    .archive-count { font-size:0.88rem; color:var(--muted); }
    .search-wrap { position:relative; }
    .search-input { background:rgba(10,22,40,0.8); border:1px solid rgba(45,143,196,0.25); color:var(--white); padding:0.7rem 1rem 0.7rem 2.8rem; font-family:'Barlow',sans-serif; font-size:0.88rem; font-weight:300; outline:none; transition:border-color 0.2s; width:280px; }
    .search-input:focus { border-color:rgba(45,143,196,0.7); }
    .search-input::placeholder { color:var(--muted); }
    .search-icon { position:absolute; left:0.85rem; top:50%; transform:translateY(-50%); color:var(--muted); pointer-events:none; }
    .archive-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:2rem; padding:4rem; max-width:1400px; margin:0 auto; min-height:300px; }
    .post-card { background:var(--navy); border:1px solid rgba(45,143,196,0.15); overflow:hidden; transition:border-color 0.3s,transform 0.3s; display:flex; flex-direction:column; }
    .post-card:hover { border-color:rgba(14,158,158,0.4); transform:translateY(-4px); }
    .post-card-img { width:100%; aspect-ratio:16/9; object-fit:cover; display:block; }
    .post-card-img-placeholder { width:100%; aspect-ratio:16/9; background:linear-gradient(135deg,var(--ocean),var(--mid)); display:flex; align-items:center; justify-content:center; font-size:3rem; color:rgba(168,213,240,0.2); }
    .post-card-body { padding:1.8rem; flex:1; display:flex; flex-direction:column; }
    .post-card-date { font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); margin-bottom:0.6rem; }
    .post-card-title { font-family:'Playfair Display',serif; font-size:1.2rem; font-weight:700; color:var(--white); margin-bottom:0.8rem; line-height:1.3; }
    .post-card-excerpt { font-size:0.88rem; line-height:1.75; color:var(--text); flex:1; }
    .post-card-link { display:inline-flex; align-items:center; gap:0.4rem; margin-top:1.2rem; font-family:'Barlow Condensed',sans-serif; font-size:0.75rem; letter-spacing:0.15em; text-transform:uppercase; color:var(--gold); transition:gap 0.2s; }
    .post-card:hover .post-card-link { gap:0.8rem; }
    .no-results { grid-column:span 3; text-align:center; padding:4rem 2rem; color:var(--muted); font-size:0.95rem; }
    footer { background:var(--deep); border-top:1px solid rgba(45,143,196,0.15); padding:2.5rem 4rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; }
    .footer-logo { font-family:'Bebas Neue','Barlow Condensed',sans-serif; font-size:1.1rem; letter-spacing:0.12em; text-transform:uppercase; }
    .footer-logo span { color:var(--gold); }
    .footer-copy { font-size:0.78rem; color:var(--muted); }
    @media (max-width:900px) { nav{padding:1rem 1.5rem;} .archive-header{padding:3rem 1.5rem 2.5rem;} .archive-grid{grid-template-columns:repeat(2,1fr);padding:2rem 1.5rem;} .search-input{width:220px;} footer{padding:2rem 1.5rem;flex-direction:column;text-align:center;} }
    @media (max-width:600px) { .archive-grid{grid-template-columns:1fr;} .search-input{width:100%;} .archive-meta{flex-direction:column;align-items:flex-start;} .search-wrap{width:100%;} }
  </style>
</head>
<body>

<nav>
  <a href="/" class="nav-logo">Panorama<span>&#8918;</span>Sailing</a>
  <a href="/" class="nav-back">${t.backToSite}</a>
</nav>

<div class="archive-header">
  <div class="section-tag">${t.sectionTag}</div>
  <h1 class="archive-title">${t.heading}</h1>
  <div class="archive-meta">
    <p class="archive-count" id="post-count"></p>
    <div class="search-wrap">
      <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" class="search-input" id="search-input" placeholder="${t.searchPlaceholder}" />
    </div>
  </div>
</div>

<div class="archive-grid" id="posts-grid">
  <div class="no-results" style="color:var(--muted);">Loading posts…</div>
</div>

<footer>
  <div class="footer-logo">Panorama<span style="color:var(--gold);">&#8918;</span>Sailing</div>
  <p class="footer-copy">&copy; ${new Date().getFullYear()} Panorama Sailing. ${t.rights}</p>
</footer>

<div id="posts-data" data-posts="${postsBase64}" style="display:none;"></div>

<script>
(function() {
  try {
    // Read posts data from data attribute — avoids any JS string escaping issues
    var el = document.getElementById('posts-data');
    var encoded = el.getAttribute('data-posts');
    var decoded = decodeURIComponent(escape(atob(encoded)));
    var allPosts = JSON.parse(decoded);

    var readPost = '${t.readPost.replace(/'/g, "\\'")}';
    var noResultsText = '${t.noResults.replace(/'/g, "\\'")}';
    var noPostsText = '${t.noPosts.replace(/'/g, "\\'")}';
    var postsLabel = '${t.posts}';
    var postLabel = '${t.post}';

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function renderPosts(posts) {
      var grid = document.getElementById('posts-grid');
      var count = document.getElementById('post-count');
      if (!grid || !count) return;

      count.textContent = posts.length + ' ' + (posts.length !== 1 ? postsLabel : postLabel);

      if (posts.length === 0) {
        grid.innerHTML = '<div class="no-results">' + (allPosts.length === 0 ? noPostsText : noResultsText) + '</div>';
        return;
      }

      grid.innerHTML = posts.map(function(post) {
        var imgHtml = post.image
          ? '<img class="post-card-img" src="' + escapeHtml(post.image) + '" alt="' + escapeHtml(post.title) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';" /><div class="post-card-img-placeholder" style="display:none;">⛵</div>'
          : '<div class="post-card-img-placeholder">⛵</div>';
        return '<a href="/logbook/' + escapeHtml(post.slug) + '" class="post-card">' +
          imgHtml +
          '<div class="post-card-body">' +
            '<div class="post-card-date">' + escapeHtml(post.date) + '</div>' +
            '<div class="post-card-title">' + escapeHtml(post.title) + '</div>' +
            '<p class="post-card-excerpt">' + escapeHtml(post.excerpt) + '</p>' +
            '<span class="post-card-link">' + readPost + '</span>' +
          '</div></a>';
      }).join('');
    }

    function filterPosts(query) {
      var q = query.toLowerCase().trim();
      if (!q) { renderPosts(allPosts); return; }
      var filtered = allPosts.filter(function(p) {
        return (p.searchText && p.searchText.indexOf(q) !== -1) || 
               (p.title && p.title.toLowerCase().indexOf(q) !== -1);
      });
      renderPosts(filtered);
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        renderPosts(allPosts);
        var searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.addEventListener('input', function() { filterPosts(this.value); });
        }
      });
    } else {
      renderPosts(allPosts);
      var searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', function() { filterPosts(this.value); });
      }
    }

  } catch(err) {
    var grid = document.getElementById('posts-grid');
    if (grid) grid.innerHTML = '<div class="no-results">Error loading posts: ' + err.message + '</div>';
  }
})();
</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "public, max-age=300",
      },
    });

  } catch (err) {
    return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Error</title></head><body style="background:#061020;color:#f5f0eb;font-family:sans-serif;padding:2rem;"><h1>Error loading posts</h1><p>${err.message}</p><a href="/" style="color:#0e9e9e;">← Back to site</a></body></html>`, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

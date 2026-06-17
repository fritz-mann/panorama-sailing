export async function onRequest(context) {
  const { params } = context;
  const slug = params.slug;

  try {
    const fileResponse = await fetch(
      `https://raw.githubusercontent.com/fritz-mann/panorama-sailing/main/logbook/${slug}.md`
    );

    if (!fileResponse.ok) {
      return new Response(notFoundPage(), {
        status: 404,
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    const raw = await fileResponse.text();
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) throw new Error("Could not parse post");

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

    if (data.published === "false") {
      return new Response(notFoundPage(), {
        status: 404,
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    const title = data.title || "Untitled";
    const date = data.date
      ? new Date(data.date).toLocaleDateString('en-CA', { year:'numeric', month:'long', day:'numeric' })
      : '';
    const image = data.image || "";
    const youtube = data.youtube || "";
    const instagram = data.instagram || "";

    // Post URL for sharing
    const postUrl = `https://panoramasailing.com/logbook/${slug}`;
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedTitle = encodeURIComponent(title);

    // Share URLs
    const shareWhatsApp = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    const shareFacebook = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    const shareX = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;

    // Convert YouTube URL to embed URL
    let youtubeEmbed = "";
    if (youtube) {
      const ytMatch = youtube.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        youtubeEmbed = `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
      }
    }

    // Convert Instagram URL to embed
    let instagramEmbed = "";
    if (instagram) {
      const igUrl = instagram.replace(/\/$/, "");
      instagramEmbed = `${igUrl}/embed/`;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Panorama Sailing</title>
  <meta name="description" content="${body.replace(/[#*`_]/g, '').substring(0, 160)}" />

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-SDJ0B3XCJ5"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-SDJ0B3XCJ5');
  </script>

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:title" content="${title} — Panorama Sailing" />
  <meta property="og:description" content="${body.replace(/[#*`_]/g, '').substring(0, 160)}" />
  <meta property="og:image" content="${image || 'https://images.panoramasailing.com/hero.jpg'}" />
  <meta property="og:site_name" content="Panorama Sailing" />

  <!-- Twitter/X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title} — Panorama Sailing" />
  <meta name="twitter:description" content="${body.replace(/[#*`_]/g, '').substring(0, 160)}" />
  <meta name="twitter:image" content="${image || 'https://images.panoramasailing.com/hero.jpg'}" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@500;700&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    :root {
      --navy:#0a1628; --deep:#061020; --ocean:#0e3460; --mid:#1a5c8a;
      --sky:#2d8fc4; --foam:#a8d5f0; --gold:#0e9e9e; --gold-lt:#1dc8c8;
      --white:#f5f0eb; --text:#c8d8e4; --muted:#6a8fa8;
    }
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html { scroll-behavior:smooth; }
    body { background:var(--deep); color:var(--white); font-family:'Barlow',sans-serif; font-weight:300; }
    a { color:inherit; text-decoration:none; }
    img { max-width:100%; }

    /* NAV */
    nav {
      background:rgba(6,16,32,0.97);
      border-bottom:1px solid rgba(45,143,196,0.15);
      display:flex; align-items:center; justify-content:space-between;
      padding:1rem 4rem; position:sticky; top:0; z-index:100;
    }
    .nav-logo { font-family:'Bebas Neue','Barlow Condensed',sans-serif; font-weight:400; font-size:1.5rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--white); }
    .nav-logo span { color:var(--gold); }
    .nav-back { font-family:'Barlow Condensed',sans-serif; font-size:0.82rem; letter-spacing:0.14em; text-transform:uppercase; color:var(--gold); display:flex; align-items:center; gap:0.5rem; transition:gap 0.2s; }
    .nav-back:hover { gap:0.8rem; }

    /* HERO IMAGE */
    .post-hero { width:100%; max-height:520px; object-fit:cover; display:block; }

    /* POST CONTENT */
    .post-container { max-width:780px; margin:0 auto; padding:4rem 2rem 6rem; }
    .post-meta { display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap; }
    .post-date { font-family:'Barlow Condensed',sans-serif; font-size:0.75rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); }
    .post-title { font-family:'Playfair Display',serif; font-size:clamp(2rem,5vw,3.2rem); font-weight:700; color:var(--white); line-height:1.15; margin-bottom:2rem; }
    .post-divider { width:48px; height:2px; background:var(--gold); margin-bottom:2.5rem; }

    /* BODY TEXT */
    .post-body { font-size:1.05rem; line-height:1.9; color:var(--text); }
    .post-body h1, .post-body h2, .post-body h3 { font-family:'Playfair Display',serif; color:var(--white); margin:2rem 0 1rem; }
    .post-body h2 { font-size:1.6rem; }
    .post-body h3 { font-size:1.3rem; }
    .post-body p { margin-bottom:1.4rem; }
    .post-body strong { color:var(--white); font-weight:600; }
    .post-body em { font-style:italic; color:var(--foam); }
    .post-body a { color:var(--gold); text-decoration:underline; }
    .post-body ul, .post-body ol { margin:1rem 0 1.4rem 1.5rem; }
    .post-body li { margin-bottom:0.5rem; }
    .post-body blockquote { border-left:3px solid var(--gold); padding-left:1.2rem; color:var(--muted); font-style:italic; margin:1.5rem 0; }
    .post-body img { width:100%; margin:1.5rem 0; }

    /* YOUTUBE EMBED */
    .video-section { margin:3rem 0; }
    .video-label { font-family:'Barlow Condensed',sans-serif; font-size:0.75rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); margin-bottom:1rem; display:flex; align-items:center; gap:0.6rem; }
    .video-label::before { content:''; display:block; width:20px; height:1px; background:var(--gold); }
    .video-wrapper { position:relative; padding-bottom:56.25%; height:0; overflow:hidden; background:var(--navy); }
    .video-wrapper iframe { position:absolute; top:0; left:0; width:100%; height:100%; border:none; }

    /* INSTAGRAM EMBED */
    .instagram-section { margin:3rem 0; }
    .instagram-wrapper { display:flex; justify-content:center; }
    .instagram-wrapper iframe { border:none; overflow:hidden; border-radius:4px; }
    .instagram-fallback { text-align:center; padding:2rem; background:var(--navy); border:1px solid rgba(45,143,196,0.2); }
    .instagram-fallback a { color:var(--gold); font-family:'Barlow Condensed',sans-serif; letter-spacing:0.1em; text-transform:uppercase; font-size:0.85rem; }

    /* SHARE BUTTONS */
    .share-section {
      margin:3rem 0 0;
      padding:2rem 0;
      border-top:1px solid rgba(45,143,196,0.15);
    }
    .share-label {
      font-family:'Barlow Condensed',sans-serif;
      font-size:0.75rem; letter-spacing:0.25em; text-transform:uppercase;
      color:var(--muted); margin-bottom:1.2rem;
      display:flex; align-items:center; gap:0.8rem;
    }
    .share-label::before { content:''; display:block; width:20px; height:1px; background:var(--muted); }
    .share-buttons {
      display:flex; flex-wrap:wrap; gap:0.8rem;
    }
    .share-btn {
      display:inline-flex; align-items:center; gap:0.5rem;
      padding:0.6rem 1.2rem;
      font-family:'Barlow Condensed',sans-serif;
      font-size:0.78rem; letter-spacing:0.12em; text-transform:uppercase;
      font-weight:500; border:1px solid rgba(45,143,196,0.3);
      color:var(--text); background:transparent;
      cursor:pointer; transition:all 0.2s;
      text-decoration:none;
    }
    .share-btn:hover { border-color:var(--gold); color:var(--gold); }
    .share-btn.whatsapp:hover { border-color:#25d366; color:#25d366; }
    .share-btn.facebook:hover { border-color:#1877f2; color:#1877f2; }
    .share-btn.copy-btn.copied { border-color:var(--gold-lt); color:var(--gold-lt); }

    /* POST NAV */
    .post-nav { display:flex; justify-content:space-between; align-items:center; margin-top:3rem; padding-top:2rem; border-top:1px solid rgba(45,143,196,0.15); flex-wrap:wrap; gap:1rem; }
    .post-nav a { font-family:'Barlow Condensed',sans-serif; font-size:0.82rem; letter-spacing:0.14em; text-transform:uppercase; color:var(--gold); display:flex; align-items:center; gap:0.5rem; transition:gap 0.2s; }
    .post-nav a:hover { gap:0.8rem; }

    /* FOOTER */
    footer { background:var(--deep); border-top:1px solid rgba(45,143,196,0.15); padding:2.5rem 4rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; }
    .footer-logo { font-family:'Bebas Neue','Barlow Condensed',sans-serif; font-size:1.1rem; letter-spacing:0.12em; text-transform:uppercase; }
    .footer-logo span { color:var(--gold); }
    .footer-copy { font-size:0.78rem; color:var(--muted); }

    @media (max-width:768px) {
      nav { padding:1rem 1.5rem; }
      .post-container { padding:2.5rem 1.4rem 4rem; }
      .share-buttons { gap:0.6rem; }
      .share-btn { padding:0.55rem 1rem; font-size:0.75rem; }
      footer { padding:2rem 1.5rem; flex-direction:column; text-align:center; }
    }
  </style>
</head>
<body>

<nav>
  <a href="/" class="nav-logo">Panorama<span>⬥</span>Sailing</a>
  <a href="/logbook" class="nav-back">← All Posts</a>
</nav>

${image ? `<img class="post-hero" src="${image}" alt="${title}" />` : ''}

<div class="post-container">
  <div class="post-meta">
    <span class="post-date">${date}</span>
  </div>
  <h1 class="post-title">${title}</h1>
  <div class="post-divider"></div>
  <div class="post-body" id="post-body"></div>

  ${youtubeEmbed ? `
  <div class="video-section">
    <div class="video-label">Watch the Video</div>
    <div class="video-wrapper">
      <iframe src="${youtubeEmbed}" allowfullscreen loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
    </div>
  </div>` : ''}

  ${instagramEmbed ? `
  <div class="instagram-section">
    <div class="video-label">On Instagram</div>
    <div class="instagram-wrapper">
      <iframe src="${instagramEmbed}" width="400" height="480" scrolling="no" loading="lazy"
        onerror="this.style.display='none';document.getElementById('ig-fallback').style.display='block';"></iframe>
      <div class="instagram-fallback" id="ig-fallback" style="display:none;">
        <a href="${instagram}" target="_blank" rel="noopener">Watch on Instagram →</a>
      </div>
    </div>
  </div>` : ''}

  <!-- SHARE BUTTONS -->
  <div class="share-section">
    <div class="share-label">Share this post</div>
    <div class="share-buttons">
      <!-- WhatsApp -->
      <a href="${shareWhatsApp}" target="_blank" rel="noopener" class="share-btn whatsapp">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </a>
      <!-- Facebook -->
      <a href="${shareFacebook}" target="_blank" rel="noopener" class="share-btn facebook">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Facebook
      </a>
      <!-- X / Twitter -->
      <a href="${shareX}" target="_blank" rel="noopener" class="share-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        X / Twitter
      </a>
      <!-- Copy Link -->
      <button class="share-btn copy-btn" onclick="copyLink(this)" data-url="${postUrl}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy Link</span>
      </button>
    </div>
  </div>

  <div class="post-nav">
    <a href="/logbook">← All Posts</a>
    <a href="/#contact">Book an Experience →</a>
  </div>
</div>

<footer>
  <div class="footer-logo">Panorama<span>⬥</span>Sailing</div>
  <p class="footer-copy">© ${new Date().getFullYear()} Panorama Sailing. All rights reserved.</p>
</footer>

<script>
  // Render markdown body
  const raw = ${JSON.stringify(body)};
  document.getElementById('post-body').innerHTML = marked.parse(raw);

  // Copy link to clipboard
  function copyLink(btn) {
    const url = btn.getAttribute('data-url');
    navigator.clipboard.writeText(url).then(() => {
      btn.classList.add('copied');
      btn.querySelector('span').textContent = '✓ Copied!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.querySelector('span').textContent = 'Copy Link';
      }, 2500);
    }).catch(() => {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      btn.querySelector('span').textContent = '✓ Copied!';
      setTimeout(() => { btn.querySelector('span').textContent = 'Copy Link'; }, 2500);
    });
  }

  ${instagramEmbed ? `
  // Load Instagram embed script
  const igScript = document.createElement('script');
  igScript.src = 'https://www.instagram.com/embed.js';
  igScript.async = true;
  document.body.appendChild(igScript);` : ''}
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
    return new Response(`<h1>Error</h1><p>${err.message}</p>`, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

function notFoundPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Post Not Found — Panorama Sailing</title>
  <style>
    body { background:#061020; color:#f5f0eb; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; gap:1.5rem; text-align:center; padding:2rem; }
    h1 { font-size:2rem; }
    a { color:#0e9e9e; }
  </style>
</head>
<body>
  <h1>Post not found</h1>
  <p>This story may have moved or been unpublished.</p>
  <a href="/logbook">← Back to all posts</a>
</body>
</html>`;
}

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
  <meta property="og:title" content="${title} — Panorama Sailing" />
  <meta property="og:image" content="${image}" />
  <meta property="og:type" content="article" />
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
    .post-hero {
      width:100%; max-height:520px; object-fit:cover; display:block;
    }

    /* POST CONTENT */
    .post-container { max-width:780px; margin:0 auto; padding:4rem 2rem 6rem; }
    .post-meta {
      display:flex; align-items:center; gap:1rem;
      margin-bottom:1.5rem; flex-wrap:wrap;
    }
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

    /* NAV BUTTONS */
    .post-nav { display:flex; justify-content:space-between; align-items:center; margin-top:4rem; padding-top:2rem; border-top:1px solid rgba(45,143,196,0.15); flex-wrap:wrap; gap:1rem; }
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
      footer { padding:2rem 1.5rem; flex-direction:column; text-align:center; }
    }
  </style>
</head>
<body>

<nav>
  <a href="/" class="nav-logo">Panorama<span>⬥</span>Sailing</a>
  <a href="/logbook" class="nav-back">← All Stories</a>
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

  <div class="post-nav">
    <a href="/logbook">← All Stories</a>
    <a href="/#contact">Book an Experience →</a>
  </div>
</div>

<footer>
  <div class="footer-logo">Panorama<span>⬥</span>Sailing</div>
  <p class="footer-copy">© ${new Date().getFullYear()} Panorama Sailing. All rights reserved.</p>
</footer>

<script>
  const raw = ${JSON.stringify(body)};
  document.getElementById('post-body').innerHTML = marked.parse(raw);
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
  <a href="/logbook">← Back to all stories</a>
</body>
</html>`;
}

export async function onRequest(context) {
  try {
    // Fetch all files from the logbook folder on GitHub
    const repoResponse = await fetch(
      'https://api.github.com/repos/fritz-mann/panorama-sailing/contents/logbook',
      {
        headers: {
          'User-Agent': 'panorama-sailing-site',
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    let postUrls = [];

    if (repoResponse.ok) {
      const files = await repoResponse.json();
      const mdFiles = files.filter(f => f.name.endsWith('.md') && f.name !== '.gitkeep');

      // Fetch each post to check published status and get date
      const posts = await Promise.all(
        mdFiles.map(async (file) => {
          try {
            const fileResponse = await fetch(file.download_url);
            const raw = await fileResponse.text();
            const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
            if (!match) return null;

            const frontmatter = match[1];
            const data = {};
            frontmatter.split('\n').forEach(line => {
              const idx = line.indexOf(':');
              if (idx === -1) return;
              const key = line.slice(0, idx).trim();
              let value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
              data[key] = value;
            });

            // Skip unpublished posts
            if (data.published === 'false') return null;

            const slug = file.name.replace('.md', '');
            // Format date for sitemap (YYYY-MM-DD)
            let lastmod = '';
            if (data.date) {
              try {
                lastmod = new Date(data.date).toISOString().split('T')[0];
              } catch (e) {
                lastmod = '';
              }
            }

            return { slug, lastmod };
          } catch (e) {
            return null;
          }
        })
      );

      postUrls = posts
        .filter(Boolean)
        .sort((a, b) => b.lastmod.localeCompare(a.lastmod));
    }

    // Build the sitemap XML
    const today = new Date().toISOString().split('T')[0];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n';

    // Homepage
    xml += '  <!-- Homepage -->\n';
    xml += '  <url>\n';
    xml += '    <loc>https://panoramasailing.com/</loc>\n';
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n\n';

    // Blog Archive
    xml += '  <!-- Blog Archive -->\n';
    xml += '  <url>\n';
    xml += '    <loc>https://panoramasailing.com/logbook</loc>\n';
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n\n';

    // Individual blog posts
    if (postUrls.length > 0) {
      xml += '  <!-- Blog Posts -->\n';
      for (const post of postUrls) {
        xml += '  <url>\n';
        xml += `    <loc>https://panoramasailing.com/logbook/${post.slug}</loc>\n`;
        if (post.lastmod) {
          xml += `    <lastmod>${post.lastmod}</lastmod>\n`;
        }
        xml += '    <changefreq>monthly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }
    }

    xml += '\n</urlset>';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600', // cache for 1 hour
      },
    });

  } catch (err) {
    // Fallback to basic sitemap if anything fails
    const today = new Date().toISOString().split('T')[0];
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://panoramasailing.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://panoramasailing.com/logbook</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

    return new Response(fallback, {
      headers: {
        'Content-Type': 'application/xml;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}

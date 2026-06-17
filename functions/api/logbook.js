export async function onRequest(context) {
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

    if (!repoResponse.ok) {
      return new Response(JSON.stringify({ error: "Could not fetch logbook folder" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const files = await repoResponse.json();
    const mdFiles = files.filter(f => f.name.endsWith(".md") && f.name !== ".gitkeep");

    const posts = await Promise.all(
      mdFiles.map(async (file) => {
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

        // Slug is the filename without .md
        const slug = file.name.replace(".md", "");

        return {
          slug,
          title: data.title || "Untitled",
          date: data.date || "",
          image: data.image || "",
          published: data.published !== "false",
          body: body,
        };
      })
    );

    const publishedPosts = posts
      .filter(p => p && p.published)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return new Response(JSON.stringify({ posts: publishedPosts }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

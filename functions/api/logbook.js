export async function onRequest(context) {
  const { env } = context;

  try {
    // Fetch the list of files in the logbook folder from GitHub
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
    const mdFiles = files.filter(f => f.name.endsWith(".md"));

    // Fetch and parse each markdown file
    const posts = await Promise.all(
      mdFiles.map(async (file) => {
        const fileResponse = await fetch(file.download_url);
        const raw = await fileResponse.text();

        // Parse frontmatter (simple YAML between --- markers)
        const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        if (!match) return null;

        const frontmatter = match[1];
        const body = match[2].trim();

        const data = {};
        frontmatter.split("\n").forEach(line => {
          const idx = line.indexOf(":");
          if (idx === -1) return;
          const key = line.slice(0, idx).trim();
          let value = line.slice(idx + 1).trim();
          value = value.replace(/^["']|["']$/g, ""); // strip quotes
          data[key] = value;
        });

        return {
          title: data.title || "Untitled",
          date: data.date || "",
          image: data.image || "",
          published: data.published !== "false",
          body: body,
        };
      })
    );

    // Filter published posts and sort by date descending
    const publishedPosts = posts
      .filter(p => p && p.published)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return new Response(JSON.stringify({ posts: publishedPosts }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // cache 5 min
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

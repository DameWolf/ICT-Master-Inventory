export default async function handler(req, res) {
  const { gid = "0" } = req.query;
  const sheetId = "1D3-mLBlTAmJVOVgjspEY1w5kbVPrerSZALkyPY_C5UQ";
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("");
    }

    const csvText = await response.text();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    return res.status(200).send(csvText);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

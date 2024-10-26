function getRedirectUrlForPlayers() {
  const aTags = Array.from(
    document.querySelectorAll(".ds-grid .ds-popper-wrapper a[title]")
  );

  return aTags
    .map((item) => item.getAttribute("href"))
    .map((e) => window.origin + e);
}

async function scrapePlayerDataFromEspn(url) {
  function snakeToCamelCase(str) {
    return str.replace(/_(.)/g, (_, char) => char.toUpperCase());
  }

  function scrapeStatsFromTable(tableElement) {
    const colsNames = Array.from(tableElement.querySelectorAll("thead th")).map(
      (e) => e.textContent
    );
    const rows = tableElement.querySelectorAll("tbody tr");
    const data = [];

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      const rowData = {};

      cells.forEach((cell, index) => {
        rowData[colsNames[index]] = cell.innerText.trim();
      });

      data.push(rowData);
    });

    return data;
  }

  try {
    const res = await fetch(url);
    const textResponse = await res.text();
    const dom = new DOMParser().parseFromString(textResponse, "text/html");

    const tables = Array.from(
      dom
        .querySelector("table")
        .closest(".ds-w-full.ds-bg-fill-content-prime")
        .querySelectorAll("table")
    );
    const allStats = [];
    tables.forEach((table) => {
      const heading = table.parentNode.parentNode.childNodes[0].textContent;
      const tableData = scrapeStatsFromTable(table);

      allStats.push({
        heading,
        data: tableData,
      });
    });

    const image = dom.querySelector(".ds-bg-cover img")
      ? dom.querySelector(".ds-bg-cover img").getAttribute("src")
      : null;
    const information = Array.from(
      dom.querySelector(".ds-grid.ds-grid-cols-2").querySelectorAll("& > div")
    )
      .map((box) => {
        let label = box.querySelector("div>p").textContent;
        const value = box.querySelector("span>p").textContent;

        if (label)
          label = snakeToCamelCase(
            label.toLowerCase().trim().replace(" ", "_")
          );

        return { label, value };
      })
      .reduce((acc, curr) => {
        acc[curr.label] = curr.value;
        return acc;
      }, {});

    let scriptText = textResponse.slice(
      textResponse.indexOf(`id="__NEXT_DATA__"`)
    );
    scriptText = scriptText.slice(
      scriptText.indexOf(">") + 1,
      scriptText.indexOf("</script>")
    );

    const parsed = JSON.parse(scriptText);
    const playerData = parsed.props.appPageProps.data?.player || "";
    const { name, id, slug, objectId } = playerData;

    return {
      ...information,
      image,
      stats: allStats,
      name,
      id,
      slug,
      country: playerData.country?.name,
      objectId,
    };
  } catch (err) {
    console.log("ERROR getting stats", err);
    return null;
  }
}

const finalData = [];
for (let i = 0; i < urls.length; ++i) {
  const url = urls[i];

  console.log(`fetching for:${i + 1}/${urls.length}`);
  const data = await scrapePlayerDataFromEspn(url);
  if (!data) continue;

  finalData.push({ ...data, url });

  if (i % 5 === 0)
    localStorage.setItem("final-data", JSON.stringify(finalData));
}

// ------------ player data from team scraping function -------------------

async function scrapeSquadUrl(teamUrl) {
  try {
    const res = await fetch(teamUrl);
    const textResponse = await res.text();
    const dom = new DOMParser().parseFromString(textResponse, "text/html");

    const urls = Array.from(
      dom.querySelectorAll(".ds-flex.ds-flex-row a[href^='/series/']")
    )
      .map((item) => item.getAttribute("href"))
      .filter((e) => e)
      .map((e) => "https://www.espncricinfo.com" + e)
      .slice(0, 4);

    return urls;
  } catch (err) {
    console.error("Error scraping squad urls", err);
    return [];
  }
}

async function scrapeCricketerUrlsFromSquadUrl(squadUrl) {
  try {
    const res = await fetch(squadUrl);
    const textResponse = await res.text();
    const dom = new DOMParser().parseFromString(textResponse, "text/html");

    const urls = Array.from(
      dom.querySelectorAll(`a.ds-leading-none[href^="/cricketers/"]`)
    )
      .map((item) => item.getAttribute("href"))
      .filter((e) => e)
      .map((e) => "https://www.espncricinfo.com" + e);

    return urls;
  } catch (err) {
    console.error("Error scraping cricketer urls", err);
    return [];
  }
}

const pUrls = [];
for (const u of squadUrls) {
  const res = await scrapeCricketerUrlsFromSquadUrl(u);

  res.forEach((e) => {
    if (pUrls.includes(e)) console.log("Already present");
    else pUrls.push(e);
  });
}

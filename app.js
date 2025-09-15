function log(msg) {
  const consoleBox = document.getElementById("console");
  consoleBox.textContent += "\n" + msg;
  consoleBox.scrollTop = consoleBox.scrollHeight;
}

function uint8ToBase64(uint8Array) {
  let binary = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

async function createRepo(token, name, visibility) {
  const res = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      private: visibility === "private"
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

async function uploadZipFiles(username, repo, token, file) {
  const zip = await JSZip.loadAsync(file);
  const entries = [];
  zip.forEach((path, entry) => {
    if (!entry.dir) entries.push(entry);
  });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const content = await entry.async("uint8array");
    const base64 = uint8ToBase64(content);
    const path = entry.name;

    log(`Uploading ${path} ...`);

    const res = await fetch(
      `https://api.github.com/repos/${username}/${repo}/contents/${encodeURIComponent(path)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Add ${path}`,
          content: base64
        })
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `Failed at ${path}`);
    }
    log(`✔ Done ${path}`);
  }
}

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const repo = document.getElementById("repo").value.trim();
  const token = document.getElementById("token").value.trim();
  const visibility = document.getElementById("visibility").value;
  const file = document.getElementById("zipFile").files[0];

  document.getElementById("console").textContent = "Starting...\n";
  document.getElementById("successBox").style.display = "none";

  try {
    log(`Creating repo ${repo} (${visibility})`);
    const repoData = await createRepo(token, repo, visibility);
    await uploadZipFiles(username, repo, token, file);

    log("All files uploaded!");
    document.getElementById("successBox").style.display = "block";
    document.getElementById("repoLink").href = repoData.html_url;
  } catch (err) {
    log("❌ ERROR: " + err.message);
  }
});
    
